from django.contrib import admin
from .models import Report, DownloadToken


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'status', 'uploaded_by', 'created_at']
    list_filter = ['status', 'patient__clinic']
    search_fields = ['title', 'patient__name']


@admin.register(DownloadToken)
class DownloadTokenAdmin(admin.ModelAdmin):
    list_display = ['report', 'created_by', 'expires_at', 'used']
