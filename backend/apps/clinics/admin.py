from django.contrib import admin
from .models import Clinic, ClinicSettings


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ['name', 'cnpj', 'email', 'is_active', 'created_at']


@admin.register(ClinicSettings)
class ClinicSettingsAdmin(admin.ModelAdmin):
    list_display = ['clinic', 'portal_title', 'primary_color']
