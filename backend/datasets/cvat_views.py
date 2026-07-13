from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .cvat_service import get_annotation_batch_log, get_cvat_hub, stage_vehicle_cvat_pack


class CvatHubView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = get_cvat_hub()
        data['recent_exports'] = get_annotation_batch_log()
        return success_response(data)


class CvatStagePackView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        result = stage_vehicle_cvat_pack()
        if not result.get('ok'):
            return error_response(result.get('error') or 'Staging failed', errors=result)
        return success_response(result, message='Vehicle CVAT pack staged')
