from rest_framework import serializers
from apps.patients.serializers import PatientListSerializer
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_protocol = serializers.CharField(source='patient.protocol', read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    signed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None

    def get_signed_by_name(self, obj):
        return obj.signed_by.get_full_name() if obj.signed_by else None

    class Meta:
        model = Report
        fields = [
            'id', 'patient', 'patient_name', 'patient_protocol',
            'title', 'description', 'file_name', 'file_size', 'file_hash',
            'status', 'status_display',
            'uploaded_by_name', 'approved_by_name', 'signed_by_name',
            'digital_signature', 'signature_metadata',
            'approved_at', 'signed_at', 'published_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_name', 'file_size', 'file_hash', 'status',
            'digital_signature', 'signature_metadata',
            'approved_at', 'signed_at', 'published_at', 'created_at', 'updated_at'
        ]


class ReportUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['patient', 'title', 'description', 'file']
