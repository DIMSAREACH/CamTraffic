from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .models import AIModelVersion
from .serializers import AIModelVersionSerializer


class AIModelVersionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AIModelVersionSerializer
    queryset = AIModelVersion.objects.select_related('uploaded_by').order_by('-uploaded_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        model = serializer.save(uploaded_by=request.user)
        if model.is_active:
            AIModelVersion.objects.exclude(pk=model.pk).update(is_active=False)
        log_audit(
            user=request.user,
            action='create',
            resource='ai_model_version',
            resource_id=model.id,
            request=request,
            new_value={'version': model.version, 'is_active': model.is_active},
        )
        return success_response(
            AIModelVersionSerializer(model).data,
            message='AI model version registered',
            status_code=status.HTTP_201_CREATED,
        )


class AIModelVersionActivateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            model = AIModelVersion.objects.get(pk=pk)
        except AIModelVersion.DoesNotExist:
            return error_response('Model version not found', status_code=status.HTTP_404_NOT_FOUND)

        AIModelVersion.objects.exclude(pk=model.pk).update(is_active=False)
        model.is_active = True
        model.save(update_fields=['is_active'])

        log_audit(
            user=request.user,
            action='update',
            resource='ai_model_version',
            resource_id=model.id,
            request=request,
            new_value={'is_active': True, 'version': model.version},
        )

        return success_response(
            AIModelVersionSerializer(model).data,
            message=f'Activated model {model.version}',
        )
