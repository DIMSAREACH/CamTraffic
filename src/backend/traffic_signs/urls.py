from django.urls import path

from .views import ChatbotView, TrafficSignDetailView, TrafficSignListCreateView

urlpatterns = [
    path('', TrafficSignListCreateView.as_view(), name='sign-list'),
    path('chatbot/', ChatbotView.as_view(), name='sign-chatbot'),
    path('<int:pk>/', TrafficSignDetailView.as_view(), name='sign-detail'),
]
