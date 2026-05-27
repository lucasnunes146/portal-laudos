from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import AuditLog
from .serializers import AuditLogSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_list(request):
    if request.user.role not in ('admin', 'doctor'):
        return Response({'error': 'Sem permissão.'}, status=403)

    clinic = request.user.clinic
    qs = AuditLog.objects.filter(clinic=clinic).select_related('user', 'report')

    action = request.GET.get('action')
    if action:
        qs = qs.filter(action=action)

    paginator = PageNumberPagination()
    paginator.page_size = 50
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)
