from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    report_title = serializers.CharField(source='report.title', read_only=True)

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'Sistema'

    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'action_display', 'user', 'user_name',
            'report', 'report_title', 'description', 'ip_address',
            'extra_data', 'created_at'
        ]
