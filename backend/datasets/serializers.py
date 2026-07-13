from rest_framework import serializers

from .models import Dataset, DatasetVersion


class DatasetVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetVersion
        fields = [
            'id', 'dataset', 'version', 'manifest_path', 'notes',
            'image_count', 'is_current', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DatasetSerializer(serializers.ModelSerializer):
    versions = DatasetVersionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'slug', 'dataset_type', 'description', 'root_path',
            'image_count', 'label_count', 'class_count', 'status',
            'created_by', 'created_by_name', 'versions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name', 'versions']


class DatasetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = [
            'name', 'slug', 'dataset_type', 'description', 'root_path',
            'image_count', 'label_count', 'class_count', 'status',
        ]
