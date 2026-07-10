from django.urls import path

from . import views

app_name = 'system'

urlpatterns = [
    path('locales/', views.locales, name='locales'),
    path('settings/manage/', views.SystemSettingListCreateView.as_view(), name='settings-manage'),
    path('settings/manage/<int:setting_id>/', views.SystemSettingDetailView.as_view(), name='setting-detail'),
    path('backups/', views.BackupListCreateView.as_view(), name='backup-list-create'),
    path('backups/<int:backup_id>/', views.BackupDetailView.as_view(), name='backup-detail'),
    path('backups/<int:backup_id>/restore/', views.BackupRestoreView.as_view(), name='backup-restore'),
]
