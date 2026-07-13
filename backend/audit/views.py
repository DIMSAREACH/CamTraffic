from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics

from core.permissions import IsAdmin
from core.responses import success_response

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'resource', 'user']
    search_fields = ['resource', 'resource_id', 'user__full_name', 'user__email']
    ordering_fields = ['timestamp']
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)
