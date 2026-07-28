"""Vehicle owner listing and reassignment (admin)."""

from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .models import Vehicle
from .serializers import VehicleSerializer

User = get_user_model()


class VehicleOwnerListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        search = (request.query_params.get('search') or '').strip().lower()
        owners = (
            User.objects.filter(vehicles__isnull=False)
            .annotate(vehicle_count=Count('vehicles', distinct=True))
            .order_by('-vehicle_count', 'full_name')
            .distinct()
        )
        if search:
            owners = owners.filter(
                full_name__icontains=search,
            ) | owners.filter(email__icontains=search)
        rows = [
            {
                'id': str(user.id),
                'full_name': user.full_name,
                'email': user.email,
                'phone': user.phone or '',
                'role': user.role,
                'vehicle_count': user.vehicle_count,
                'status': 'active' if user.is_active else 'inactive',
            }
            for user in owners[:500]
        ]
        return success_response(rows)


class VehicleOwnerDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, owner_id):
        try:
            user = User.objects.get(pk=owner_id)
        except User.DoesNotExist:
            return error_response('Owner not found', status_code=404)
        vehicles = Vehicle.objects.filter(owner=user).select_related('owner')
        return success_response({
            'owner': {
                'id': str(user.id),
                'full_name': user.full_name,
                'email': user.email,
                'phone': user.phone or '',
                'role': user.role,
            },
            'vehicles': VehicleSerializer(vehicles, many=True).data,
        })


class VehicleOwnerReassignView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        vehicle_id = request.data.get('vehicle_id')
        new_owner_id = request.data.get('new_owner_id')
        if not vehicle_id or not new_owner_id:
            return error_response('vehicle_id and new_owner_id are required')
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
            new_owner = User.objects.get(pk=new_owner_id)
        except (Vehicle.DoesNotExist, User.DoesNotExist):
            return error_response('Vehicle or owner not found', status_code=404)
        vehicle.owner = new_owner
        vehicle.save(update_fields=['owner'])
        return success_response(
            VehicleSerializer(vehicle).data,
            message=f'Vehicle reassigned to {new_owner.full_name}',
        )
