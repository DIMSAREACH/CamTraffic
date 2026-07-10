from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response

from apps.rbac.permissions import HasRBACRole

from .models import AIModel, AIModelVersion, AITrainingHistory
from .serializers import (
    AIModelCreateSerializer,
    AIModelManageSerializer,
    AIModelUpdateSerializer,
    AIModelVersionCreateSerializer,
    AIModelVersionManageSerializer,
    AIModelVersionUpdateSerializer,
    AITrainingHistoryCreateSerializer,
    AITrainingHistoryManageSerializer,
    AITrainingHistoryUpdateSerializer,
)


class AIModelListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = AIModel.objects.annotate(version_count=Count('versions')).order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search),
            )
        model_type = request.query_params.get('model_type', '').strip()
        if model_type:
            queryset = queryset.filter(model_type=model_type)
        return success_response(AIModelManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = AIModelCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        model = serializer.save()
        return success_response(
            AIModelManageSerializer(model).data,
            message='AI model created successfully.',
            status=status.HTTP_201_CREATED,
        )


class AIModelDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_model(model_id: int) -> AIModel:
        return get_object_or_404(AIModel.objects.annotate(version_count=Count('versions')), id=model_id)

    def patch(self, request, model_id: int):
        model = self._get_model(model_id)
        serializer = AIModelUpdateSerializer(model, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(AIModelManageSerializer(model).data, message='AI model updated successfully.')

    def delete(self, request, model_id: int):
        model = self._get_model(model_id)
        model.delete()
        return success_response(None, message='AI model deleted successfully.')


class AIModelVersionListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = AIModelVersion.objects.select_related('ai_model').order_by('-created_at')
        model_id = request.query_params.get('model_id', '').strip()
        if model_id:
            queryset = queryset.filter(ai_model_id=model_id)
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return success_response(AIModelVersionManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = AIModelVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        version = serializer.save()
        return success_response(
            AIModelVersionManageSerializer(version).data,
            message='AI model version created successfully.',
            status=status.HTTP_201_CREATED,
        )


class AIModelVersionDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_version(version_id: int) -> AIModelVersion:
        return get_object_or_404(AIModelVersion.objects.select_related('ai_model'), id=version_id)

    def patch(self, request, version_id: int):
        version = self._get_version(version_id)
        serializer = AIModelVersionUpdateSerializer(version, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            AIModelVersionManageSerializer(version).data,
            message='AI model version updated successfully.',
        )

    def delete(self, request, version_id: int):
        version = self._get_version(version_id)
        version.delete()
        return success_response(None, message='AI model version deleted successfully.')


class AIModelVersionActivateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_version(version_id: int) -> AIModelVersion:
        return get_object_or_404(AIModelVersion.objects.select_related('ai_model'), id=version_id)

    def post(self, request, version_id: int):
        version = self._get_version(version_id)
        with transaction.atomic():
            AIModelVersion.objects.filter(ai_model_id=version.ai_model_id, is_active=True).update(is_active=False)
            version.is_active = True
            version.save(update_fields=['is_active', 'updated_at'])
        return success_response(
            AIModelVersionManageSerializer(version).data,
            message='AI model version activated successfully.',
        )


class AITrainingHistoryListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = AITrainingHistory.objects.select_related(
            'model_version__ai_model',
            'triggered_by',
        ).order_by('-started_at')
        model_id = request.query_params.get('model_id', '').strip()
        if model_id:
            queryset = queryset.filter(model_version__ai_model_id=model_id)
        version_id = request.query_params.get('version_id', '').strip()
        if version_id:
            queryset = queryset.filter(model_version_id=version_id)
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return success_response(AITrainingHistoryManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = AITrainingHistoryCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        return success_response(
            AITrainingHistoryManageSerializer(record).data,
            message='Training history record created successfully.',
            status=status.HTTP_201_CREATED,
        )


class AITrainingHistoryDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_record(record_id: int) -> AITrainingHistory:
        return get_object_or_404(
            AITrainingHistory.objects.select_related('model_version__ai_model', 'triggered_by'),
            id=record_id,
        )

    def patch(self, request, record_id: int):
        record = self._get_record(record_id)
        serializer = AITrainingHistoryUpdateSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            AITrainingHistoryManageSerializer(record).data,
            message='Training history record updated successfully.',
        )

    def delete(self, request, record_id: int):
        record = self._get_record(record_id)
        record.delete()
        return success_response(None, message='Training history record deleted successfully.')
