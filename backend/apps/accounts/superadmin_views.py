from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clinics.models import Clinic
from apps.accounts.models import User


def _require_superadmin(user):
    return user.role == User.ROLE_SUPERADMIN


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinic_list(request):
    if not _require_superadmin(request.user):
        return Response({'error': 'Sem permissão.'}, status=403)

    clinics = Clinic.objects.prefetch_related('users', 'patients').order_by('-created_at')
    data = []
    for c in clinics:
        data.append({
            'id': c.id,
            'name': c.name,
            'cnpj': c.cnpj,
            'email': c.email,
            'phone': c.phone,
            'is_active': c.is_active,
            'plan': c.plan,
            'plan_display': c.get_plan_display(),
            'license_active': c.license_active,
            'license_valid_until': c.license_valid_until,
            'license_notes': c.license_notes,
            'users_count': c.users.count(),
            'patients_count': c.patients.count(),
            'created_at': c.created_at,
        })
    return Response(data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def clinic_detail(request, pk):
    if not _require_superadmin(request.user):
        return Response({'error': 'Sem permissão.'}, status=403)

    try:
        clinic = Clinic.objects.prefetch_related('users').get(pk=pk)
    except Clinic.DoesNotExist:
        return Response({'error': 'Clínica não encontrada.'}, status=404)

    if request.method == 'GET':
        users = list(clinic.users.values(
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active'
        ))
        return Response({
            'id': clinic.id,
            'name': clinic.name,
            'cnpj': clinic.cnpj,
            'email': clinic.email,
            'phone': clinic.phone,
            'address': clinic.address,
            'is_active': clinic.is_active,
            'plan': clinic.plan,
            'plan_display': clinic.get_plan_display(),
            'license_active': clinic.license_active,
            'license_valid_until': clinic.license_valid_until,
            'license_notes': clinic.license_notes,
            'created_at': clinic.created_at,
            'users': users,
        })

    allowed = ['plan', 'license_active', 'license_valid_until', 'license_notes', 'is_active']
    for field in allowed:
        if field in request.data:
            setattr(clinic, field, request.data[field])
    clinic.save()
    return Response({'message': 'Atualizado com sucesso.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    if not _require_superadmin(request.user):
        return Response({'error': 'Sem permissão.'}, status=403)

    from apps.patients.models import Patient
    from apps.reports.models import Report

    total_clinics = Clinic.objects.count()
    active_clinics = Clinic.objects.filter(license_active=True, is_active=True).count()
    total_patients = Patient.objects.count()
    total_reports = Report.objects.count()

    return Response({
        'total_clinics': total_clinics,
        'active_clinics': active_clinics,
        'inactive_clinics': total_clinics - active_clinics,
        'total_patients': total_patients,
        'total_reports': total_reports,
    })
