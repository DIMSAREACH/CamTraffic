from django.urls import path

from . import views

app_name = 'ai_models'

urlpatterns = [
    path('management/', views.AIModelListCreateView.as_view(), name='model-list-create'),
    path('management/<int:model_id>/', views.AIModelDetailView.as_view(), name='model-detail'),
    path('versions/', views.AIModelVersionListCreateView.as_view(), name='version-list-create'),
    path('versions/<int:version_id>/', views.AIModelVersionDetailView.as_view(), name='version-detail'),
    path('versions/<int:version_id>/activate/', views.AIModelVersionActivateView.as_view(), name='version-activate'),
    path('training-history/', views.AITrainingHistoryListCreateView.as_view(), name='training-history-list-create'),
    path('training-history/<int:record_id>/', views.AITrainingHistoryDetailView.as_view(), name='training-history-detail'),
]
