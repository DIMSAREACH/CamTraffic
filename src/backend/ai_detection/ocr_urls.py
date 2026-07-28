from django.urls import path

from .ocr_views import OCRRecognizeView, OCRResultListView

urlpatterns = [
    path('', OCRResultListView.as_view(), name='ocr-list'),
    path('recognize/', OCRRecognizeView.as_view(), name='ocr-recognize'),
]
