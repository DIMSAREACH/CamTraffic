from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated

from ai_detection.page_stats import _trained_sign_codes
from core.permissions import IsAdmin
from core.responses import success_response

from .models import TrafficSign
from .serializers import TrafficSignSerializer


class TrafficSignListCreateView(generics.ListCreateAPIView):
    serializer_class = TrafficSignSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['sign_name', 'sign_code', 'description']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        from ai_detection.page_stats import _trained_sign_codes

        qs = TrafficSign.objects.all().order_by('sign_code')
        flag = self.request.query_params.get('trained_only', '').lower()
        if flag in ('1', 'true', 'yes'):
            codes = _trained_sign_codes()
            if codes:
                qs = qs.filter(sign_code__in=codes)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        sign = serializer.save()
        return success_response(
            TrafficSignSerializer(sign, context={'request': request}).data,
            message='Traffic sign created',
            status_code=status.HTTP_201_CREATED,
        )


class TrafficSignDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrafficSignSerializer
    queryset = TrafficSign.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return success_response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        sign = serializer.save()
        return success_response(
            TrafficSignSerializer(sign, context={'request': request}).data,
            message='Traffic sign updated',
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(None, message='Traffic sign deleted')


class ChatbotView(generics.GenericAPIView):
    """Simple traffic sign Q&A for learning module."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '').lower()
        signs = TrafficSign.objects.all()
        matches = []
        for sign in signs:
            if any(word in question for word in sign.sign_name.lower().split()):
                matches.append(sign)
            elif sign.sign_code and sign.sign_code.lower() in question:
                matches.append(sign)
        if not matches and signs.exists():
            keywords = ['stop', 'speed', 'yield', 'no', 'parking', 'turn', 'pedestrian']
            for kw in keywords:
                if kw in question:
                    matches = list(signs.filter(sign_name__icontains=kw)[:3])
                    break
        if matches:
            sign = matches[0]
            answer = (
                f"**{sign.sign_name}** ({sign.category})\n\n"
                f"{sign.description}\n\n"
                f"**Guidance:** {sign.guidance or 'Follow standard traffic rules.'}"
            )
            if sign.penalty:
                answer += f"\n\n**Penalty:** {sign.penalty}"
        else:
            answer = (
                'I could not find a specific sign. Browse the Traffic Signs Learning page '
                'or upload an image on the AI Detection page for identification.'
            )
        return success_response({'answer': answer, 'sign': TrafficSignSerializer(matches[0]).data if matches else None})
