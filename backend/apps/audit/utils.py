from .models import AuditLog


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, report=None, description='', extra=None):
    user = request.user if request.user.is_authenticated else None
    clinic = user.clinic if user else None

    AuditLog.objects.create(
        clinic=clinic,
        user=user,
        action=action,
        description=description,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        report=report,
        extra_data=extra or {},
    )
