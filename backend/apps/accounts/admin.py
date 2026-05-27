from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'clinic', 'totp_enabled', 'is_active']
    list_filter = ['role', 'clinic', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Portal', {'fields': ('role', 'clinic', 'phone', 'totp_secret', 'totp_enabled')}),
    )
