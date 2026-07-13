from django.urls import path

from .views import AIModelVersionActivateView, AIModelVersionListCreateView

urlpatterns = [
    path('', AIModelVersionListCreateView.as_view(), name='ai-model-list'),
    path('<uuid:pk>/activate/', AIModelVersionActivateView.as_view(), name='ai-model-activate'),
]
