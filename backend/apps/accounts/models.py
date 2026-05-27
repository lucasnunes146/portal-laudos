import pyotp
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_SECRETARY = 'secretary'
    ROLE_DOCTOR = 'doctor'
    ROLE_PATIENT = 'patient'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrador'),
        (ROLE_SECRETARY, 'Secretária'),
        (ROLE_DOCTOR, 'Médica'),
        (ROLE_PATIENT, 'Paciente'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_SECRETARY)
    clinic = models.ForeignKey(
        'clinics.Clinic', on_delete=models.CASCADE,
        null=True, blank=True, related_name='users'
    )
    phone = models.CharField(max_length=20, blank=True)

    # 2FA
    totp_secret = models.CharField(max_length=32, blank=True)
    totp_enabled = models.BooleanField(default=False)

    def get_totp_uri(self):
        return pyotp.totp.TOTP(self.totp_secret).provisioning_uri(
            name=self.email,
            issuer_name='Portal de Laudos'
        )

    def verify_totp(self, code):
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(code, valid_window=1)

    @property
    def is_staff_member(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_SECRETARY, self.ROLE_DOCTOR)

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
