from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/clinic/', include('apps.clinics.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/audit-logs/', include('apps.audit.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
