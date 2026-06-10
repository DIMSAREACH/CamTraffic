"""CamTraffic URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/users/', include('users.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/signs/', include('traffic_signs.urls')),
    path('api/fines/', include('fines.urls')),
    path('api/', include('violations.urls')),
    path('api/ai/', include('ai_detection.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/', include('infrastructure.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
