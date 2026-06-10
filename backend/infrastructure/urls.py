from django.urls import path

from .views import CameraDetailView, CameraListCreateView, RoadDetailView, RoadListCreateView

urlpatterns = [
    path('roads/', RoadListCreateView.as_view(), name='road-list'),
    path('roads/<int:pk>/', RoadDetailView.as_view(), name='road-detail'),
    path('cameras/', CameraListCreateView.as_view(), name='camera-list'),
    path('cameras/<int:pk>/', CameraDetailView.as_view(), name='camera-detail'),
]
