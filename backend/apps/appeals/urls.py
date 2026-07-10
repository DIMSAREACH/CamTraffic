from django.urls import path

from . import views

app_name = 'appeals'

urlpatterns = [
    path('driver/appealable/', views.DriverAppealableViolationListView.as_view(), name='driver-appealable-list'),
    path('driver/mine/', views.DriverAppealListCreateView.as_view(), name='driver-appeal-list'),
    path('driver/mine/<int:appeal_id>/', views.DriverAppealDetailView.as_view(), name='driver-appeal-detail'),
    path('officer/review/', views.OfficerAppealListView.as_view(), name='officer-appeal-list'),
    path('officer/review/<int:appeal_id>/', views.OfficerAppealDetailView.as_view(), name='officer-appeal-detail'),
    path('officer/review/<int:appeal_id>/decision/', views.OfficerAppealDecisionView.as_view(), name='officer-appeal-decision'),
]
