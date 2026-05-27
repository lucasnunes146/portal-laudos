from django.db import models


class Clinic(models.Model):
    PLAN_FREE = 'free'
    PLAN_BASIC = 'basic'
    PLAN_PRO = 'pro'
    PLAN_CHOICES = [
        (PLAN_FREE, 'Gratuito'),
        (PLAN_BASIC, 'Básico'),
        (PLAN_PRO, 'Profissional'),
    ]

    name = models.CharField(max_length=200, verbose_name='Nome')
    cnpj = models.CharField(max_length=18, blank=True, verbose_name='CNPJ')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # License management
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_FREE)
    license_active = models.BooleanField(default=True, verbose_name='Licença ativa')
    license_valid_until = models.DateField(null=True, blank=True, verbose_name='Válida até')
    license_notes = models.TextField(blank=True, verbose_name='Observações da licença')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Clínica'
        verbose_name_plural = 'Clínicas'


class ClinicSettings(models.Model):
    clinic = models.OneToOneField(Clinic, on_delete=models.CASCADE, related_name='settings')
    logo = models.ImageField(upload_to='clinic_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#2563EB')
    secondary_color = models.CharField(max_length=7, default='#1E40AF')
    portal_title = models.CharField(max_length=100, default='Portal de Laudos')
    portal_subtitle = models.CharField(max_length=200, blank=True)
    welcome_message = models.TextField(blank=True)
    footer_text = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f'Settings - {self.clinic.name}'

    class Meta:
        verbose_name = 'Configurações da Clínica'
