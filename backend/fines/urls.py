from django.urls import path

from .views import (
    DriverLookupView,
    FineDetailView,
    FineListCreateView,
    FinePaymentView,
    FinePDFExportView,
)

urlpatterns = [
    path('', FineListCreateView.as_view(), name='fine-list'),
    path('lookup/', DriverLookupView.as_view(), name='driver-lookup'),
    path('<uuid:pk>/', FineDetailView.as_view(), name='fine-detail'),
    path('<uuid:pk>/pay/', FinePaymentView.as_view(), name='fine-pay'),
    path('<uuid:pk>/pdf/', FinePDFExportView.as_view(), name='fine-pdf'),
]
