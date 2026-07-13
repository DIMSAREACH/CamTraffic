from django.urls import path

from .views import (
    DatasetDetailView,
    DatasetListCreateView,
    DatasetScanView,
    DatasetSyncFromFilesystemView,
    DatasetVersionListCreateView,
)
from .cvat_views import CvatHubView, CvatStagePackView

urlpatterns = [
    path('', DatasetListCreateView.as_view(), name='dataset-list'),
    path('sync/', DatasetSyncFromFilesystemView.as_view(), name='dataset-sync'),
    path('cvat/', CvatHubView.as_view(), name='dataset-cvat-hub'),
    path('cvat/stage-pack/', CvatStagePackView.as_view(), name='dataset-cvat-stage'),
    path('<uuid:pk>/', DatasetDetailView.as_view(), name='dataset-detail'),
    path('<uuid:pk>/scan/', DatasetScanView.as_view(), name='dataset-scan'),
    path('<uuid:dataset_id>/versions/', DatasetVersionListCreateView.as_view(), name='dataset-versions'),
]
