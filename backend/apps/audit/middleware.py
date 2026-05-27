from .utils import log_action


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log successful logins
        if request.path == '/api/auth/login/' and request.method == 'POST':
            if response.status_code == 200 and hasattr(request, 'user') and request.user.is_authenticated:
                log_action(request, 'login', description='Login realizado')

        return response
