from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_list_create, name='report-list'),
    path('<int:pk>/', views.report_detail, name='report-detail'),
    path('<int:pk>/approve/', views.approve_report, name='report-approve'),
    path('<int:pk>/reject/', views.reject_report, name='report-reject'),
    path('<int:pk>/revision/', views.request_revision, name='report-revision'),
    path('<int:pk>/reupload/', views.reupload_file, name='report-reupload'),
    path('<int:pk>/sign/', views.sign_report, name='report-sign'),
    path('<int:pk>/publish/', views.publish_report, name='report-publish'),
    path('<int:pk>/download/', views.download_report, name='report-download'),
    path('file/<str:token>/', views.download_by_token, name='report-file'),
]
