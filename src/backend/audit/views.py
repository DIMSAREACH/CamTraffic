from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics

from core.permissions import IsPoliceOrAdmin
from core.responses import success_response

from .models import AuditLog
from .serializers import AuditLogSerializer

# Officers may only review enforcement-related audit entries (thesis: limited access).
OFFICER_AUDIT_RESOURCES = (
    'fine',
    'fines',
    'fine_payment',
    'fine_payment_verify',
    'violation',
    'traffic_violation',
    'appeal',
    'violation_appeal',
    'unknown_vehicle',
    'detection',
    'vehicle',
    'vehicles',
)


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsPoliceOrAdmin]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'resource', 'user']
    search_fields = ['resource', 'resource_id', 'action', 'user__full_name', 'user__email', 'ip_address']
    ordering_fields = ['timestamp']
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')

    def get_queryset(self):
        qs = super().get_queryset()
        role = getattr(self.request.user, 'role', None)
        if role == 'police':
            qs = qs.filter(resource__in=OFFICER_AUDIT_RESOURCES)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        # Cap payload for portal list views; client paginates locally.
        limit = min(int(request.query_params.get('page_size') or 500), 1000)
        serializer = self.get_serializer(queryset[:limit], many=True)
        return success_response(serializer.data)
