from django.urls import path

from . import views

app_name = 'violations'

urlpatterns = [
    path('officer/review/', views.OfficerViolationReviewListView.as_view(), name='officer-review-list'),
    path(
        'officer/review/<int:violation_id>/',
        views.OfficerViolationReviewDetailView.as_view(),
        name='officer-review-detail',
    ),
    path(
        'officer/review/<int:violation_id>/decision/',
        views.OfficerViolationDecisionView.as_view(),
        name='officer-review-decision',
    ),
    path('officer/evidence/', views.OfficerEvidenceListView.as_view(), name='officer-evidence-list'),
    path(
        'officer/evidence/<int:violation_id>/',
        views.OfficerEvidenceDetailView.as_view(),
        name='officer-evidence-detail',
    ),
    path('driver/mine/', views.DriverViolationListView.as_view(), name='driver-violation-list'),
    path(
        'driver/mine/<int:violation_id>/',
        views.DriverViolationDetailView.as_view(),
        name='driver-violation-detail',
    ),
]
