from django.urls import path

from .views import DriverLookupView, FineDetailView, FineListCreateView, FinePDFExportView

urlpatterns = [
    path('', FineListCreateView.as_view(), name='fine-list'),
    path('lookup/', DriverLookupView.as_view(), name='driver-lookup'),
    path('<int:pk>/', FineDetailView.as_view(), name='fine-detail'),
    path('<int:pk>/pdf/', FinePDFExportView.as_view(), name='fine-pdf'),
]
