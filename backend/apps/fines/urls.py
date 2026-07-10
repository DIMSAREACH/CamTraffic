from django.urls import path

from . import views

app_name = 'fines'

urlpatterns = [
    path('driver/mine/', views.DriverFineListView.as_view(), name='driver-fine-list'),
    path('driver/mine/<int:fine_id>/', views.DriverFineDetailView.as_view(), name='driver-fine-detail'),
    path('driver/mine/<int:fine_id>/pay/', views.DriverFinePaymentView.as_view(), name='driver-fine-pay'),
    path('driver/payments/', views.DriverFinePaymentListView.as_view(), name='driver-payment-list'),
    path(
        'driver/payments/<int:payment_id>/',
        views.DriverFinePaymentDetailView.as_view(),
        name='driver-payment-detail',
    ),
]
