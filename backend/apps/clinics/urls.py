from django.urls import path
from . import views

urlpatterns = [
    path('', views.clinic_view, name='clinic'),
    path('settings/', views.clinic_settings_view, name='clinic-settings'),
    path('<int:clinic_id>/public/', views.public_clinic_settings, name='clinic-public'),
]
