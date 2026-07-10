from django.urls import path

from . import views

app_name = 'traffic_signs'

urlpatterns = [
    path('categories/', views.SignCategoryCatalogView.as_view(), name='category-catalog'),
    path('categories/manage/', views.SignCategoryListCreateView.as_view(), name='category-management-list'),
    path('categories/manage/<int:category_id>/', views.SignCategoryDetailView.as_view(), name='category-management-detail'),
    path('management/', views.TrafficSignListCreateView.as_view(), name='management-list'),
    path('management/<int:sign_id>/', views.TrafficSignDetailView.as_view(), name='management-detail'),
]
