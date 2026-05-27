import pyotp
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Credenciais inválidas.')
        if not user.is_active:
            raise serializers.ValidationError('Conta desativada.')
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'role', 'phone', 'totp_enabled',
                  'clinic', 'clinic_name', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'totp_enabled']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError('As senhas não conferem.')
        return data

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value


class TOTPSetupSerializer(serializers.Serializer):
    secret = serializers.CharField(read_only=True)
    uri = serializers.CharField(read_only=True)
    qr_url = serializers.CharField(read_only=True)


class TOTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, min_length=6)
    action = serializers.ChoiceField(choices=['enable', 'verify'], default='verify')
