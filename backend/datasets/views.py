import json
from pathlib import Path

from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .models import Dataset, DatasetVersion
from .serializers import DatasetCreateSerializer, DatasetSerializer, DatasetVersionSerializer


def _repo_root() -> Path:
    return Path(settings.BASE_DIR).parent


def _scan_dataset_path(root_path: str) -> dict:
    base = _repo_root() / root_path.replace('\\', '/').strip('/')
    if not base.is_dir():
        return {'image_count': 0, 'label_count': 0, 'class_count': 0}
    images = 0
    labels = 0
    for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp'):
        images += len(list(base.rglob(ext)))
    for ext in ('*.txt',):
        labels += len(list(base.rglob(ext)))
    classes = 0
    classes_file = base / 'classes.txt'
    if classes_file.is_file():
        classes = len([ln for ln in classes_file.read_text(encoding='utf-8').splitlines() if ln.strip()])
    data_yaml = base / 'data.yaml'
    if data_yaml.is_file() and classes < 1:
        try:
            import yaml  # optional
            meta = yaml.safe_load(data_yaml.read_text(encoding='utf-8'))
            names = meta.get('names') or []
            classes = len(names) if isinstance(names, (list, dict)) else 0
        except Exception:
            pass
    return {'image_count': images, 'label_count': labels, 'class_count': classes}


class DatasetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DatasetCreateSerializer
        return DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.select_related('created_by').prefetch_related('versions').all()

    def list(self, request, *args, **kwargs):
        serializer = DatasetSerializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = DatasetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        counts = _scan_dataset_path(serializer.validated_data.get('root_path', ''))
        dataset = serializer.save(
            created_by=request.user,
            image_count=counts['image_count'],
            label_count=counts['label_count'],
            class_count=counts['class_count'],
        )
        log_audit(
            user=request.user,
            action='create',
            resource='dataset',
            resource_id=dataset.id,
            request=request,
            new_value={'slug': dataset.slug},
        )
        return success_response(
            DatasetSerializer(dataset).data,
            message='Dataset registered',
            status_code=status.HTTP_201_CREATED,
        )


class DatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Dataset.objects.select_related('created_by').prefetch_related('versions').all()
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DatasetCreateSerializer
        return DatasetSerializer

    def retrieve(self, request, *args, **kwargs):
        return success_response(DatasetSerializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = DatasetCreateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        root = serializer.validated_data.get('root_path', instance.root_path)
        counts = _scan_dataset_path(root)
        dataset = serializer.save(**counts)
        return success_response(DatasetSerializer(dataset).data, message='Dataset updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(message='Dataset removed')


class DatasetScanView(APIView):
    """Re-scan filesystem counts for a dataset."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            dataset = Dataset.objects.get(pk=pk)
        except Dataset.DoesNotExist:
            return error_response('Dataset not found', status_code=status.HTTP_404_NOT_FOUND)
        counts = _scan_dataset_path(dataset.root_path)
        for field, value in counts.items():
            setattr(dataset, field, value)
        dataset.save(update_fields=['image_count', 'label_count', 'class_count', 'updated_at'])
        return success_response(DatasetSerializer(dataset).data, message='Dataset rescanned')


class DatasetVersionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = DatasetVersionSerializer

    def get_queryset(self):
        dataset_id = self.kwargs['dataset_id']
        return DatasetVersion.objects.filter(dataset_id=dataset_id).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            dataset = Dataset.objects.get(pk=self.kwargs['dataset_id'])
        except Dataset.DoesNotExist:
            return error_response('Dataset not found', status_code=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('is_current'):
            DatasetVersion.objects.filter(dataset=dataset).update(is_current=False)
        version = serializer.save(dataset=dataset)
        return success_response(
            DatasetVersionSerializer(version).data,
            message='Dataset version created',
            status_code=status.HTTP_201_CREATED,
        )


class DatasetSyncFromFilesystemView(APIView):
    """Register known ai/dataset* folders as Dataset rows."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        ai_root = _repo_root() / 'ai'
        created = []
        for candidate in ('dataset_10', 'dataset'):
            path = ai_root / candidate
            if not path.is_dir():
                continue
            slug = candidate.replace('_', '-')
            counts = _scan_dataset_path(f'ai/{candidate}')
            dataset, was_created = Dataset.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': f'Cambodia {candidate.replace("_", " ").title()}',
                    'dataset_type': 'signs' if 'sign' in candidate or candidate == 'dataset_10' else 'combined',
                    'description': f'Auto-synced from ai/{candidate}/',
                    'root_path': f'ai/{candidate}/',
                    'status': 'active',
                    'created_by': request.user,
                    **counts,
                },
            )
            if was_created:
                created.append(dataset.slug)
        return success_response({
            'synced': DatasetSerializer(
                Dataset.objects.filter(slug__in=['dataset-10', 'dataset']),
                many=True,
            ).data,
            'created_slugs': created,
        }, message='Filesystem datasets synced')
