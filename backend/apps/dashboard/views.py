from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.patients.models import Patient
from apps.reports.models import Report
from apps.audit.models import AuditLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    if request.user.role == 'patient':
        return Response({'error': 'Sem permissão.'}, status=403)

    clinic = request.user.clinic
    if not clinic:
        return Response({'error': 'Usuário sem clínica.'}, status=400)

    now = timezone.now()
    last_30 = now - timedelta(days=30)

    total_patients = Patient.objects.filter(clinic=clinic).count()
    new_patients_month = Patient.objects.filter(clinic=clinic, created_at__gte=last_30).count()

    reports_qs = Report.objects.filter(patient__clinic=clinic)
    total_reports = reports_qs.count()
    pending_reports = reports_qs.filter(status__in=['uploaded', 'approved']).count()
    signed_reports = reports_qs.filter(status='signed').count()
    published_reports = reports_qs.filter(status='published').count()

    reports_by_status = list(
        reports_qs.values('status').annotate(count=Count('id')).order_by()
    )

    recent_activity = AuditLog.objects.filter(
        clinic=clinic
    ).select_related('user', 'report').order_by('-created_at')[:10]

    recent_activity_data = [
        {
            'id': log.id,
            'action': log.action,
            'action_display': log.get_action_display(),
            'user': log.user.get_full_name() if log.user else 'Sistema',
            'report_title': log.report.title if log.report else None,
            'created_at': log.created_at,
        }
        for log in recent_activity
    ]

    return Response({
        'patients': {
            'total': total_patients,
            'new_this_month': new_patients_month,
        },
        'reports': {
            'total': total_reports,
            'pending': pending_reports,
            'signed': signed_reports,
            'published': published_reports,
            'by_status': reports_by_status,
        },
        'recent_activity': recent_activity_data,
    })
