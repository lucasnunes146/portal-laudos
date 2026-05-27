from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['protocol', 'name', 'cpf', 'phone', 'email', 'clinic', 'created_at']
    list_filter = ['clinic']
    search_fields = ['name', 'cpf', 'protocol']
