import hashlib
import mimetypes
from datetime import timedelta

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
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
            'patient', 'uploaded_by', 'approved_by', 'signed_by'
        ).get(pk=report_id)
        if user.role == 'patient':
            if report.patient.portal_user != user:
                return None
            if report.status != Report.STATUS_PUBLISHED:
                return None
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
            # Patient sees only their published reports
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

    if report.status != Report.STATUS_UPLOADED:
        return Response({'error': f'Laudo não pode ser aprovado (status: {report.status}).'}, status=400)

    report.status = Report.STATUS_APPROVED
    report.approved_by = request.user
    report.approved_at = timezone.now()
    report.save()
    log_action(request, 'approve', report=report)
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

    # MVP digital signature: SHA-256 of file + signer info
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

    # Send generic notification email
    _send_notification(report)

    return Response(ReportSerializer(report).data)


def _send_notification(report):
    from django.core.mail import send_mail
    patient = report.patient
    if patient.email:
        try:
            send_mail(
                subject='Seu laudo está disponível no portal',
                message=(
                    f'Olá {patient.name},\n\n'
                    'Um novo laudo foi disponibilizado no Portal de Laudos.\n'
                    f'Acesse o portal para visualizar: {settings.FRONTEND_URL}/portal\n\n'
                    'Atenciosamente,\nEquipe do Portal de Laudos'
                ),
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

    download_url = f'{settings.FRONTEND_URL}/api/reports/file/{token_obj.token}/'
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
