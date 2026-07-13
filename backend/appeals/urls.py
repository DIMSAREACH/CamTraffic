from django.urls import path

from .views import AppealDetailView, AppealListCreateView, AppealReviewView

urlpatterns = [
    path('', AppealListCreateView.as_view(), name='appeal-list'),
    path('<uuid:pk>/', AppealDetailView.as_view(), name='appeal-detail'),
    path('<uuid:pk>/review/', AppealReviewView.as_view(), name='appeal-review'),
]
