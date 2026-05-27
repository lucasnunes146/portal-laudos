import uuid
from django.db import models
from django.utils import timezone


def generate_protocol():
    year = timezone.now().year
    # Format: PAC-2024-XXXXX
    from apps.patients.models import Patient
    count = Patient.objects.filter(
        created_at__year=year
    ).count() + 1
    return f'PAC-{year}-{count:05d}'


class Patient(models.Model):
    clinic = models.ForeignKey(
        'clinics.Clinic', on_delete=models.CASCADE, related_name='patients'
    )
    protocol = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=200, verbose_name='Nome completo')
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Data de nascimento')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefone')
    email = models.EmailField(blank=True, verbose_name='E-mail')
    address = models.TextField(blank=True, verbose_name='Endereço')
    notes = models.TextField(blank=True, verbose_name='Observações')

    # Portal access
    portal_user = models.OneToOneField(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='patient_profile'
    )

    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='created_patients'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.protocol:
            year = timezone.now().year
            count = Patient.objects.filter(
                clinic=self.clinic, created_at__year=year
            ).count() + 1
            self.protocol = f'PAC-{year}-{count:05d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.protocol})'

    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['-created_at']
