from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Clinic, ClinicSettings
from .serializers import ClinicSerializer, ClinicSettingsSerializer


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def clinic_view(request):
    clinic = request.user.clinic
    if not clinic:
        return Response({'error': 'Clínica não encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(ClinicSerializer(clinic, context={'request': request}).data)

    if request.user.role != 'admin':
        return Response({'error': 'Sem permissão.'}, status=403)

    serializer = ClinicSerializer(clinic, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def clinic_settings_view(request):
    clinic = request.user.clinic
    if not clinic:
        return Response({'error': 'Clínica não encontrada.'}, status=404)

    settings_obj, _ = ClinicSettings.objects.get_or_create(clinic=clinic)

    if request.method == 'GET':
        return Response(ClinicSettingsSerializer(settings_obj, context={'request': request}).data)

    if request.user.role != 'admin':
        return Response({'error': 'Sem permissão.'}, status=403)

    serializer = ClinicSettingsSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
def public_clinic_settings(request, clinic_id):
    try:
        settings_obj = ClinicSettings.objects.select_related('clinic').get(clinic_id=clinic_id)
        return Response(ClinicSettingsSerializer(settings_obj, context={'request': request}).data)
    except ClinicSettings.DoesNotExist:
        return Response({'error': 'Clínica não encontrada.'}, status=404)
