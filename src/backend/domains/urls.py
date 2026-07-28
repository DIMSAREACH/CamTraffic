"""Domain URL aggregator — mounted at /api/v1/admin|officer|citizen/."""
from django.urls import include, path

urlpatterns = [
    path('admin/', include('domains.admin_urls')),
    path('officer/', include('domains.officer_urls')),
    path('citizen/', include('domains.citizen_urls')),
]
