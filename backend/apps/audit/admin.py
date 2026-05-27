from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'action', 'user', 'clinic', 'ip_address']
    list_filter = ['action', 'clinic']
    readonly_fields = [f.name for f in AuditLog._meta.fields]
