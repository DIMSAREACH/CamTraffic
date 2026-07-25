from django.urls import path

from .views import (
    CameraDetailView,
    CameraListCreateView,
    CameraLiveStatusView,
    RoadDetailView,
    RoadListCreateView,
)

urlpatterns = [
    path('roads/', RoadListCreateView.as_view(), name='road-list'),
    path('roads/<uuid:pk>/', RoadDetailView.as_view(), name='road-detail'),
    path('cameras/', CameraListCreateView.as_view(), name='camera-list'),
    path('cameras/live-status/', CameraLiveStatusView.as_view(), name='camera-live-status'),
    path('cameras/<uuid:pk>/', CameraDetailView.as_view(), name='camera-detail'),
]
