from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response
from infrastructure.models import PoliceStation
from infrastructure.serializers import PoliceStationSerializer
from users.models import Driver, Officer

from .officer_serializers import (
    DriverCreateSerializer,
    DriverSerializer,
    DriverUpdateSerializer,
    OfficerCreateSerializer,
    OfficerSerializer,
    OfficerUpdateSerializer,
)


class OfficerListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'department', 'station']
    search_fields = ['badge_no', 'rank', 'department', 'user__full_name', 'user__email']
    ordering_fields = ['badge_no', 'created_at', 'rank']
    ordering = ['badge_no']

    def get_queryset(self):
        return Officer.objects.select_related('user', 'station').filter(user__role='police')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OfficerCreateSerializer
        return OfficerSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = OfficerSerializer(queryset, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = OfficerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        officer = serializer.save()
        return success_response(
            OfficerSerializer(officer).data,
            message='Officer created',
            status_code=status.HTTP_201_CREATED,
        )


class OfficerDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    queryset = Officer.objects.select_related('user', 'station').filter(user__role='police')
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return OfficerUpdateSerializer
        return OfficerSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        return success_response(OfficerSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = OfficerUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        officer = serializer.save()
        from users.profile_services import sync_profile_status

        sync_profile_status(officer.user)
        return success_response(OfficerSerializer(officer).data, message='Officer updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        if user.pk == request.user.pk:
            return error_response('You cannot delete your own officer account.', status_code=status.HTTP_400_BAD_REQUEST)
        if user.role == 'admin':
            return error_response(
                'Administrator accounts cannot be deleted from the officers list.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        from users.profile_services import safe_delete_user

        try:
            hard_deleted, _deactivated, message = safe_delete_user(user)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        if hard_deleted:
            return success_response(message='Officer deleted')
        instance.refresh_from_db()
        return success_response(
            OfficerSerializer(instance).data,
            message=message.replace('Account', 'Officer', 1).replace('User', 'Officer', 1),
        )


class PoliceStationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    serializer_class = PoliceStationSerializer
    queryset = PoliceStation.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'city', 'region']
    search_fields = ['name', 'code', 'city', 'address']
    ordering_fields = ['name', 'city', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return success_response(PoliceStationSerializer(queryset, many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        station = serializer.save()
        return success_response(
            PoliceStationSerializer(station).data,
            message='Police station created',
            status_code=status.HTTP_201_CREATED,
        )


class PoliceStationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = PoliceStationSerializer
    queryset = PoliceStation.objects.all()
    lookup_url_kwarg = 'pk'

    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        # Normalize blank optional fields so PATCH from the admin UI does not fail
        # when the client omits or clears city/region/phone/address.
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        for key in ('city', 'region', 'address', 'phone'):
            if key in data and data.get(key) is None:
                data[key] = ''
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        station = serializer.save()
        return success_response(PoliceStationSerializer(station).data, message='Police station updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        officer_count = instance.officers.count()
        if officer_count:
            # Soft-close: keep FK integrity for assigned officers instead of hard 400.
            instance.status = 'inactive'
            instance.save(update_fields=['status', 'updated_at'])
            return success_response(
                PoliceStationSerializer(instance).data,
                message=(
                    f'Station has {officer_count} assigned officer(s), so it was marked inactive '
                    'instead of deleted. Reassign officers to remove it permanently.'
                ),
            )
        instance.delete()
        return success_response(message='Police station deleted')


class DriverListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'kyc_status']
    search_fields = ['license_no', 'national_id', 'user__full_name', 'user__email']
    ordering_fields = ['license_no', 'created_at', 'kyc_status']
    ordering = ['license_no']

    def get_queryset(self):
        return Driver.objects.select_related('user').filter(user__role='driver')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DriverCreateSerializer
        return DriverSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsPoliceOrAdmin()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return success_response(DriverSerializer(queryset, many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = DriverCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()
        return success_response(
            DriverSerializer(driver).data,
            message='Driver created',
            status_code=status.HTTP_201_CREATED,
        )


class DriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    queryset = Driver.objects.select_related('user').filter(user__role='driver')
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DriverUpdateSerializer
        return DriverSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), IsAdmin()]
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAuthenticated(), IsPoliceOrAdmin()]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        return success_response(DriverSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = DriverUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()
        from users.profile_services import sync_profile_status

        sync_profile_status(driver.user)
        return success_response(DriverSerializer(driver).data, message='Driver updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        if user.pk == request.user.pk:
            return error_response('You cannot delete your own account.', status_code=status.HTTP_400_BAD_REQUEST)
        from users.profile_services import safe_delete_user

        try:
            hard_deleted, _deactivated, message = safe_delete_user(user)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        if hard_deleted:
            return success_response(message='Driver deleted')
        instance.refresh_from_db()
        return success_response(
            DriverSerializer(instance).data,
            message=message.replace('Account', 'Driver', 1).replace('User', 'Driver', 1),
        )
