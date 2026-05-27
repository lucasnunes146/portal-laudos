import hashlib
import mimetypes
import secrets
from datetime import timedelta

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from apps.audit.utils import log_action
from .models import Report, DownloadToken
from .serializers import ReportSerializer, ReportUploadSerializer


def get_clinic_report(user, report_id):
    try:
        report = Report.objects.select_related(
            'patient', 'patient__clinic', 'uploaded_by', 'approved_by', 'signed_by', 'rejected_by'
        ).get(pk=report_id)
        if user.role == 'patient':
            if report.patient.portal_user != user:
                return None
            if report.status != Report.STATUS_PUBLISHED:
                return None
        elif user.role == 'superadmin':
            pass  # superadmin can see all
        elif report.patient.clinic != user.clinic:
            return None
        return report
    except Report.DoesNotExist:
        return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def report_list_create(request):
    if request.method == 'GET':
        user = request.user
        if user.role == 'patient':
            try:
                from apps.patients.models import Patient
                patient = Patient.objects.get(portal_user=user)
                qs = Report.objects.filter(
                    patient=patient, status=Report.STATUS_PUBLISHED
                ).select_related('patient', 'uploaded_by')
            except Exception:
                qs = Report.objects.none()
        else:
            qs = Report.objects.filter(
                patient__clinic=user.clinic
            ).select_related('patient', 'uploaded_by')

            status_filter = request.GET.get('status')
            patient_id = request.GET.get('patient')
            if status_filter:
                qs = qs.filter(status=status_filter)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ReportSerializer(page, many=True).data)

    # POST — upload
    if request.user.role not in ('admin', 'secretary', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    serializer = ReportUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    patient = serializer.validated_data['patient']
    if patient.clinic != request.user.clinic:
        return Response({'error': 'Paciente de outra clínica.'}, status=403)

    report = serializer.save(uploaded_by=request.user)
    log_action(request, 'upload', report=report)
    return Response(ReportSerializer(report).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_detail(request, pk):
    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_report(request, pk):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status not in (Report.STATUS_UPLOADED, Report.STATUS_REVISION):
        return Response({'error': f'Laudo não pode ser aprovado (status: {report.status}).'}, status=400)

    report.status = Report.STATUS_APPROVED
    report.approved_by = request.user
    report.approved_at = timezone.now()
    report.doctor_notes = ''
    report.save()
    log_action(request, 'approve', report=report)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_report(request, pk):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status == Report.STATUS_PUBLISHED:
        return Response({'error': 'Laudo já publicado não pode ser rejeitado.'}, status=400)

    notes = request.data.get('notes', '').strip()
    report.status = Report.STATUS_REJECTED
    report.doctor_notes = notes
    report.rejected_by = request.user
    report.rejected_at = timezone.now()
    report.save()
    log_action(request, 'reject', report=report)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_revision(request, pk):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status in (Report.STATUS_PUBLISHED, Report.STATUS_REJECTED):
        return Response({'error': 'Não é possível solicitar revisão com este status.'}, status=400)

    notes = request.data.get('notes', '').strip()
    if not notes:
        return Response({'error': 'Informe o motivo da revisão.'}, status=400)

    report.status = Report.STATUS_REVISION
    report.doctor_notes = notes
    report.save()
    log_action(request, 'revision', report=report)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reupload_file(request, pk):
    """Secretary or doctor re-uploads the file (e.g., after revision or with signed version)."""
    if request.user.role not in ('admin', 'secretary', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status in (Report.STATUS_PUBLISHED, Report.STATUS_REJECTED):
        return Response({'error': 'Não é possível substituir o arquivo com este status.'}, status=400)

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'Nenhum arquivo enviado.'}, status=400)

    report.file = file
    report.file_name = file.name
    report.file_size = file.size
    # Recompute hash
    sha256 = hashlib.sha256()
    file.seek(0)
    for chunk in iter(lambda: file.read(8192), b''):
        sha256.update(chunk)
    file.seek(0)
    report.file_hash = sha256.hexdigest()

    # Reset signature since file changed
    report.digital_signature = ''
    report.signature_metadata = {}

    # Adjust status
    if report.status == Report.STATUS_REVISION:
        report.status = Report.STATUS_UPLOADED
        report.doctor_notes = ''
    elif report.status == Report.STATUS_SIGNED:
        report.status = Report.STATUS_APPROVED

    report.save()
    log_action(request, 'reupload', report=report)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_report(request, pk):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status != Report.STATUS_APPROVED:
        return Response({'error': f'Laudo não pode ser assinado (status: {report.status}).'}, status=400)

    signature_data = (
        f'{report.file_hash}:{request.user.pk}:{report.patient.pk}:{timezone.now().isoformat()}'
    )
    signature = hashlib.sha256(signature_data.encode()).hexdigest()

    report.status = Report.STATUS_SIGNED
    report.signed_by = request.user
    report.signed_at = timezone.now()
    report.digital_signature = signature
    report.signature_metadata = {
        'signer_id': request.user.pk,
        'signer_name': request.user.get_full_name(),
        'file_hash': report.file_hash,
        'signed_at': timezone.now().isoformat(),
        'algorithm': 'SHA-256-MVP',
    }
    report.save()
    log_action(request, 'sign', report=report)
    return Response(ReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_report(request, pk):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    if report.status != Report.STATUS_SIGNED:
        return Response({'error': f'Laudo não pode ser publicado (status: {report.status}).'}, status=400)

    report.status = Report.STATUS_PUBLISHED
    report.published_by = request.user
    report.published_at = timezone.now()
    report.save()
    log_action(request, 'publish', report=report)

    _create_portal_and_notify(report)

    return Response(ReportSerializer(report).data)


def _create_portal_and_notify(report):
    """Auto-create patient portal access on first publication and send email with credentials."""
    from django.core.mail import send_mail
    from apps.accounts.models import User

    patient = report.patient
    temp_password = None

    if not patient.portal_user:
        try:
            base_username = (
                patient.cpf.replace('.', '').replace('-', '')
                if patient.cpf else f'pac{patient.pk}'
            )
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}{counter}'
                counter += 1

            temp_password = secrets.token_urlsafe(8)
            name_parts = patient.name.split()
            portal_user = User.objects.create_user(
                username=username,
                password=temp_password,
                role=User.ROLE_PATIENT,
                first_name=name_parts[0] if name_parts else '',
                last_name=' '.join(name_parts[1:]) if len(name_parts) > 1 else '',
                email=patient.email,
                clinic=patient.clinic,
            )
            patient.portal_user = portal_user
            patient.save()
        except Exception:
            pass

    if patient.email:
        try:
            clinic_name = patient.clinic.name
            portal_url = f'{settings.FRONTEND_URL}/portal'

            if temp_password:
                subject = f'Seu laudo está disponível — {clinic_name}'
                message = (
                    f'Olá {patient.name},\n\n'
                    f'Seu laudo "{report.title}" foi publicado no portal da {clinic_name}.\n\n'
                    f'Acesse em: {portal_url}\n\n'
                    f'Seus dados de acesso:\n'
                    f'  Usuário: {patient.portal_user.username}\n'
                    f'  Senha: {temp_password}\n\n'
                    f'Recomendamos alterar a senha após o primeiro acesso.\n\n'
                    f'Atenciosamente,\n{clinic_name}'
                )
            else:
                subject = f'Novo laudo disponível — {clinic_name}'
                message = (
                    f'Olá {patient.name},\n\n'
                    f'Um novo laudo "{report.title}" foi disponibilizado no portal da {clinic_name}.\n\n'
                    f'Acesse em: {portal_url}\n\n'
                    f'Atenciosamente,\n{clinic_name}'
                )

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[patient.email],
                fail_silently=True,
            )
        except Exception:
            pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_report(request, pk):
    report = get_clinic_report(request.user, pk)
    if not report:
        return Response({'error': 'Laudo não encontrado.'}, status=404)

    expiry = timezone.now() + timedelta(minutes=settings.DOWNLOAD_TOKEN_EXPIRY_MINUTES)
    token_obj = DownloadToken.objects.create(
        report=report,
        created_by=request.user,
        expires_at=expiry,
    )
    log_action(request, 'download', report=report)

    download_url = f'{settings.BACKEND_URL}/api/reports/file/{token_obj.token}/'
    return Response({'download_url': download_url, 'expires_at': expiry})


@api_view(['GET'])
@permission_classes([AllowAny])
def download_by_token(request, token):
    try:
        token_obj = DownloadToken.objects.select_related('report').get(token=token)
    except DownloadToken.DoesNotExist:
        raise Http404

    if not token_obj.is_valid:
        return Response({'error': 'Token expirado ou já utilizado.'}, status=410)

    token_obj.used = True
    token_obj.used_at = timezone.now()
    token_obj.save()

    report = token_obj.report
    file_path = report.file.path
    content_type, _ = mimetypes.guess_type(file_path)
    response = FileResponse(
        open(file_path, 'rb'),
        content_type=content_type or 'application/octet-stream',
    )
    response['Content-Disposition'] = f'inline; filename="{report.file_name}"'
    return response
