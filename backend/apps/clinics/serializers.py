from rest_framework import serializers
from .models import Clinic, ClinicSettings


class ClinicSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None

    class Meta:
        model = ClinicSettings
        fields = ['logo', 'logo_url', 'primary_color', 'secondary_color',
                  'portal_title', 'portal_subtitle', 'welcome_message', 'footer_text']


class ClinicSerializer(serializers.ModelSerializer):
    settings = ClinicSettingsSerializer(read_only=True)
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)

    class Meta:
        model = Clinic
        fields = ['id', 'name', 'cnpj', 'phone', 'email', 'address',
                  'is_active', 'plan', 'plan_display', 'license_active',
                  'license_valid_until', 'created_at', 'settings']
        read_only_fields = ['id', 'created_at']
