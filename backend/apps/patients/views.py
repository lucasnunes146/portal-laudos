import secrets
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from apps.accounts.models import User
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer


def require_roles(*roles):
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            if request.user.role not in roles:
                return Response({'error': 'Sem permissão.'}, status=403)
            return func(request, *args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def patient_list_create(request):
    clinic = request.user.clinic
    if not clinic:
        return Response({'error': 'Usuário sem clínica.'}, status=400)

    if request.user.role == 'patient':
        return Response({'error': 'Sem permissão.'}, status=403)

    if request.method == 'GET':
        qs = Patient.objects.filter(clinic=clinic).select_related('portal_user')
        q = request.GET.get('q', '')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(cpf__icontains=q) | Q(protocol__icontains=q))

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        serializer = PatientListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    if request.user.role not in ('admin', 'secretary'):
        return Response({'error': 'Sem permissão.'}, status=403)

    serializer = PatientSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    patient = serializer.save(clinic=clinic, created_by=request.user)
    return Response(PatientSerializer(patient).data, status=201)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def patient_detail(request, pk):
    clinic = request.user.clinic
    if not clinic and request.user.role != 'patient':
        return Response({'error': 'Sem permissão.'}, status=403)

    # Patients can only see their own record
    if request.user.role == 'patient':
        try:
            patient = Patient.objects.get(portal_user=request.user)
            if str(patient.pk) != str(pk):
                return Response({'error': 'Sem permissão.'}, status=403)
        except Patient.DoesNotExist:
            return Response({'error': 'Paciente não encontrado.'}, status=404)
    else:
        try:
            patient = Patient.objects.get(pk=pk, clinic=clinic)
        except Patient.DoesNotExist:
            return Response({'error': 'Paciente não encontrado.'}, status=404)

    if request.method == 'GET':
        return Response(PatientSerializer(patient).data)

    if request.user.role not in ('admin', 'secretary'):
        return Response({'error': 'Sem permissão.'}, status=403)

    serializer = PatientSerializer(patient, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_search(request):
    clinic = request.user.clinic
    if not clinic or request.user.role == 'patient':
        return Response({'error': 'Sem permissão.'}, status=403)

    q = request.GET.get('q', '')
    if not q:
        return Response([])

    patients = Patient.objects.filter(
        clinic=clinic
    ).filter(
        Q(name__icontains=q) | Q(cpf__icontains=q) | Q(protocol__icontains=q)
    )[:10]

    return Response(PatientListSerializer(patients, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_access(request, pk):
    if request.user.role not in ('admin', 'secretary'):
        return Response({'error': 'Sem permissão.'}, status=403)

    clinic = request.user.clinic
    try:
        patient = Patient.objects.get(pk=pk, clinic=clinic)
    except Patient.DoesNotExist:
        return Response({'error': 'Paciente não encontrado.'}, status=404)

    if patient.portal_user:
        return Response({'error': 'Paciente já possui acesso ao portal.'}, status=400)

    if not patient.email:
        return Response({'error': 'Paciente sem e-mail cadastrado.'}, status=400)

    username = patient.cpf.replace('.', '').replace('-', '') or f'pac{patient.pk}'
    temp_password = secrets.token_urlsafe(10)

    portal_user = User.objects.create_user(
        username=username,
        email=patient.email,
        first_name=patient.name.split()[0],
        last_name=' '.join(patient.name.split()[1:]),
        password=temp_password,
        role=User.ROLE_PATIENT,
        clinic=clinic,
    )
    patient.portal_user = portal_user
    patient.save()

    return Response({
        'message': 'Acesso criado com sucesso.',
        'username': username,
        'temp_password': temp_password,
    })
