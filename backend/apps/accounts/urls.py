from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views, superadmin_views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('login/2fa/', views.verify_2fa_login, name='verify-2fa-login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me_view, name='me'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('2fa/setup/', views.totp_setup_view, name='2fa-setup'),
    path('2fa/verify/', views.totp_verify_view, name='2fa-verify'),

    # Super admin
    path('superadmin/dashboard/', superadmin_views.dashboard, name='superadmin-dashboard'),
    path('superadmin/clinics/', superadmin_views.clinic_list, name='superadmin-clinics'),
    path('superadmin/clinics/<int:pk>/', superadmin_views.clinic_detail, name='superadmin-clinic-detail'),
]
