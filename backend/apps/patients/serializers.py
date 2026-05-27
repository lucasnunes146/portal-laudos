from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    reports_count = serializers.SerializerMethodField()
    portal_active = serializers.SerializerMethodField()
    portal_username = serializers.SerializerMethodField()

    def get_reports_count(self, obj):
        return obj.reports.count()

    def get_portal_active(self, obj):
        return obj.portal_user is not None and obj.portal_user.is_active

    def get_portal_username(self, obj):
        return obj.portal_user.username if obj.portal_user else None

    class Meta:
        model = Patient
        fields = [
            'id', 'protocol', 'name', 'cpf', 'birth_date', 'phone', 'email',
            'address', 'notes', 'reports_count', 'portal_active',
            'portal_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'protocol', 'created_at', 'updated_at']


class PatientListSerializer(serializers.ModelSerializer):
    reports_count = serializers.SerializerMethodField()
    portal_active = serializers.SerializerMethodField()

    def get_reports_count(self, obj):
        return obj.reports.count()

    def get_portal_active(self, obj):
        return obj.portal_user is not None and obj.portal_user.is_active

    class Meta:
        model = Patient
        fields = ['id', 'protocol', 'name', 'cpf', 'phone', 'email',
                  'reports_count', 'portal_active', 'created_at']
