from django.urls import path

from .views import (
    ImportCommitView,
    ImportHistoryDetailView,
    ImportHistoryListView,
    ImportTemplateView,
    ImportTypesView,
    ImportValidateView,
)

urlpatterns = [
    path('types/', ImportTypesView.as_view(), name='import-types'),
    path('template/', ImportTemplateView.as_view(), name='import-template'),
    path('validate/', ImportValidateView.as_view(), name='import-validate'),
    path('commit/', ImportCommitView.as_view(), name='import-commit'),
    path('history/', ImportHistoryListView.as_view(), name='import-history'),
    path('history/<uuid:pk>/', ImportHistoryDetailView.as_view(), name='import-history-detail'),
]
