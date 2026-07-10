from django.db import models
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole

from .models import SignCategory, TrafficSign
from .serializers import (
    SignCategoryCreateSerializer,
    SignCategoryManageSerializer,
    SignCategoryOptionSerializer,
    SignCategoryUpdateSerializer,
    TrafficSignCreateSerializer,
    TrafficSignManageSerializer,
    TrafficSignUpdateSerializer,
)


class SignCategoryCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        categories = SignCategory.objects.filter(is_active=True).order_by('name_en')
        return success_response(SignCategoryOptionSerializer(categories, many=True).data)


class SignCategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = SignCategory.objects.annotate(sign_count=models.Count('signs')).order_by('name_en')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name_en__icontains=search)
                | Q(name_km__icontains=search),
            )
        is_active = request.query_params.get('is_active', '').strip().lower()
        if is_active in ('true', 'false'):
            queryset = queryset.filter(is_active=is_active == 'true')
        return success_response(SignCategoryManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SignCategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        category = SignCategory.objects.annotate(sign_count=models.Count('signs')).get(pk=category.pk)
        return success_response(
            SignCategoryManageSerializer(category).data,
            message='Sign category created successfully.',
            status=status.HTTP_201_CREATED,
        )


class SignCategoryDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_category(category_id: int) -> SignCategory:
        return get_object_or_404(
            SignCategory.objects.annotate(sign_count=models.Count('signs')),
            id=category_id,
        )

    def get(self, request, category_id: int):
        category = self._get_category(category_id)
        return success_response(SignCategoryManageSerializer(category).data)

    def patch(self, request, category_id: int):
        category = self._get_category(category_id)
        serializer = SignCategoryUpdateSerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        category = SignCategory.objects.annotate(sign_count=models.Count('signs')).get(pk=category.pk)
        return success_response(
            SignCategoryManageSerializer(category).data,
            message='Sign category updated successfully.',
        )

    def delete(self, request, category_id: int):
        category = self._get_category(category_id)
        if category.signs.exists():
            return error_response(
                'Cannot delete a category with assigned traffic signs. Deactivate it instead.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        category.delete()
        return success_response(None, message='Sign category deleted successfully.')


class TrafficSignListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = TrafficSign.objects.select_related('category').order_by('code')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name_en__icontains=search)
                | Q(name_km__icontains=search)
                | Q(category__name_en__icontains=search)
                | Q(category__code__icontains=search),
            )
        category_id = request.query_params.get('category_id', '').strip()
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        is_active = request.query_params.get('is_active', '').strip().lower()
        if is_active in ('true', 'false'):
            queryset = queryset.filter(is_active=is_active == 'true')
        serializer = TrafficSignManageSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def post(self, request):
        serializer = TrafficSignCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sign = serializer.save()
        sign = TrafficSign.objects.select_related('category').get(pk=sign.pk)
        return success_response(
            TrafficSignManageSerializer(sign, context={'request': request}).data,
            message='Traffic sign created successfully.',
            status=status.HTTP_201_CREATED,
        )


class TrafficSignDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_sign(sign_id: int) -> TrafficSign:
        return get_object_or_404(TrafficSign.objects.select_related('category'), id=sign_id)

    def get(self, request, sign_id: int):
        sign = self._get_sign(sign_id)
        return success_response(TrafficSignManageSerializer(sign, context={'request': request}).data)

    def patch(self, request, sign_id: int):
        sign = self._get_sign(sign_id)
        serializer = TrafficSignUpdateSerializer(sign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        sign = serializer.save()
        sign = TrafficSign.objects.select_related('category').get(pk=sign.pk)
        return success_response(
            TrafficSignManageSerializer(sign, context={'request': request}).data,
            message='Traffic sign updated successfully.',
        )

    def delete(self, request, sign_id: int):
        sign = self._get_sign(sign_id)
        sign.delete()
        return success_response(None, message='Traffic sign deleted successfully.')
