import hashlib
import secrets
import uuid
from django.db import models
from django.utils import timezone


def report_upload_path(instance, filename):
    return f'reports/{instance.patient.clinic_id}/{instance.patient_id}/{uuid.uuid4()}/{filename}'


class Report(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_APPROVED = 'approved'
    STATUS_SIGNED = 'signed'
    STATUS_PUBLISHED = 'published'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, 'Enviado'),
        (STATUS_APPROVED, 'Aprovado'),
        (STATUS_SIGNED, 'Assinado'),
        (STATUS_PUBLISHED, 'Publicado'),
        (STATUS_REJECTED, 'Rejeitado'),
    ]

    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='reports'
    )
    title = models.CharField(max_length=300, verbose_name='Título')
    description = models.TextField(blank=True, verbose_name='Descrição')
    file = models.FileField(upload_to=report_upload_path, verbose_name='Arquivo')
    file_hash = models.CharField(max_length=64, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_UPLOADED
    )

    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='uploaded_reports'
    )
    approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_reports'
    )
    signed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='signed_reports'
    )
    published_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='published_reports'
    )

    # Digital signature (MVP: SHA-256)
    digital_signature = models.TextField(blank=True)
    signature_metadata = models.JSONField(default=dict, blank=True)

    approved_at = models.DateTimeField(null=True, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.file and not self.file_hash:
            self.file_hash = self._compute_hash()
            self.file_name = self.file.name.split('/')[-1]
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def _compute_hash(self):
        sha256 = hashlib.sha256()
        self.file.seek(0)
        for chunk in iter(lambda: self.file.read(8192), b''):
            sha256.update(chunk)
        self.file.seek(0)
        return sha256.hexdigest()

    def __str__(self):
        return f'{self.title} — {self.patient.name} ({self.status})'

    class Meta:
        verbose_name = 'Laudo'
        verbose_name_plural = 'Laudos'
        ordering = ['-created_at']


class DownloadToken(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='download_tokens')
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    created_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    def __str__(self):
        return f'Token {self.token[:8]}... — {self.report.title}'

    class Meta:
        verbose_name = 'Token de Download'
