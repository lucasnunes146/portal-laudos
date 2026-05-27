from django.db import models


class AuditLog(models.Model):
    ACTION_LOGIN = 'login'
    ACTION_LOGOUT = 'logout'
    ACTION_UPLOAD = 'upload'
    ACTION_APPROVE = 'approve'
    ACTION_SIGN = 'sign'
    ACTION_PUBLISH = 'publish'
    ACTION_DOWNLOAD = 'download'
    ACTION_VIEW = 'view'
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'

    ACTION_CHOICES = [
        (ACTION_LOGIN, 'Login'),
        (ACTION_LOGOUT, 'Logout'),
        (ACTION_UPLOAD, 'Upload de Laudo'),
        (ACTION_APPROVE, 'Aprovação de Laudo'),
        (ACTION_SIGN, 'Assinatura de Laudo'),
        (ACTION_PUBLISH, 'Publicação de Laudo'),
        (ACTION_DOWNLOAD, 'Download de Laudo'),
        (ACTION_VIEW, 'Visualização'),
        (ACTION_CREATE, 'Criação'),
        (ACTION_UPDATE, 'Atualização'),
        (ACTION_DELETE, 'Exclusão'),
    ]

    clinic = models.ForeignKey(
        'clinics.Clinic', on_delete=models.SET_NULL,
        null=True, related_name='audit_logs'
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    report = models.ForeignKey(
        'reports.Report', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'[{self.created_at:%Y-%m-%d %H:%M}] {self.action} — {self.user}'

    class Meta:
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'
        ordering = ['-created_at']
