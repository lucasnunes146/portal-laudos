from django.urls import path
from . import views

urlpatterns = [
    path('', views.patient_list_create, name='patient-list'),
    path('search/', views.patient_search, name='patient-search'),
    path('<int:pk>/', views.patient_detail, name='patient-detail'),
    path('<int:pk>/create-portal-access/', views.create_portal_access, name='create-portal-access'),
]
