from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsDriver, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .models import Vehicle
from .serializers import VehicleCreateSerializer, VehicleSerializer, VehicleUpdateSerializer

User = get_user_model()


class VehicleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['plate_number', 'model']
    filterset_fields = ['vehicle_type', 'owner']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VehicleCreateSerializer
        return VehicleSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Vehicle.objects.select_related('owner').all()
        if user.role == 'police':
            return Vehicle.objects.select_related('owner').all()
        return Vehicle.objects.filter(owner=user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = VehicleSerializer(queryset, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('driver', 'admin'):
            return error_response('Only drivers can register vehicles', status_code=status.HTTP_403_FORBIDDEN)
        serializer = VehicleCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        return success_response(
            VehicleSerializer(vehicle).data,
            message='Vehicle registered',
            status_code=status.HTTP_201_CREATED,
        )


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return VehicleUpdateSerializer
        return VehicleSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'police'):
            return Vehicle.objects.select_related('owner')
        return Vehicle.objects.filter(owner=user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(VehicleSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role not in ('admin', 'police') and instance.owner_id != request.user.id:
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        partial = kwargs.pop('partial', False)
        serializer = VehicleUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        return success_response(VehicleSerializer(vehicle).data, message='Vehicle updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role not in ('admin',) and instance.owner_id != request.user.id:
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return success_response(message='Vehicle removed')


class VehicleSearchView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        plate = request.query_params.get('plate', '').strip()
        if not plate:
            return error_response('Plate number required')
        vehicle = Vehicle.objects.filter(plate_number__icontains=plate).select_related('owner').first()
        if not vehicle:
            return success_response(None, message='No vehicle found')
        return success_response(VehicleSerializer(vehicle).data)
