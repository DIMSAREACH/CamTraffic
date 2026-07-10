from django.urls import path

from . import views

app_name = 'ocr'

urlpatterns = [
    path('results/', views.OCRResultListCreateView.as_view(), name='result-list-create'),
    path('results/<int:ocr_id>/', views.OCRResultDetailView.as_view(), name='result-detail'),
    path('detections/<int:detection_id>/', views.OCRResultByDetectionView.as_view(), name='result-by-detection'),
]
