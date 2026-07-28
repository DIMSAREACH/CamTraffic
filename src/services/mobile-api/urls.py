from django.urls import path

from .views import (
    MobileApproveViolationView,
    MobileDeviceTokenView,
    MobileEvidenceView,
    MobileHomeView,
    MobileMyAppealsView,
    MobileMyFinesView,
    MobileMyVehiclesView,
    MobileMyViolationsView,
    MobileNotificationsView,
    MobilePendingCasesView,
    MobileRejectViolationView,
)

urlpatterns = [
    path('home/', MobileHomeView.as_view(), name='mobile-home'),
    path('vehicles/', MobileMyVehiclesView.as_view(), name='mobile-vehicles'),
    path('violations/', MobileMyViolationsView.as_view(), name='mobile-violations'),
    path('fines/', MobileMyFinesView.as_view(), name='mobile-fines'),
    path('appeals/', MobileMyAppealsView.as_view(), name='mobile-appeals'),
    path('notifications/', MobileNotificationsView.as_view(), name='mobile-notifications'),
    path('device-token/', MobileDeviceTokenView.as_view(), name='mobile-device-token'),
    path('cases/pending/', MobilePendingCasesView.as_view(), name='mobile-pending-cases'),
    path('cases/<uuid:pk>/approve/', MobileApproveViolationView.as_view(), name='mobile-approve'),
    path('cases/<uuid:pk>/reject/', MobileRejectViolationView.as_view(), name='mobile-reject'),
    path('evidence/<uuid:pk>/', MobileEvidenceView.as_view(), name='mobile-evidence'),
]
