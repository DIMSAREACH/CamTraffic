from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .ocr_training import (
    get_ocr_training_status,
    run_ocr_baseline,
    run_ocr_edge_cases,
    run_ocr_prereq_check,
)


class OcrTrainingStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(get_ocr_training_status())


class OcrTrainingPrereqView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        result = run_ocr_prereq_check()
        if not result.get('ok'):
            return error_response('Prerequisite check failed', errors=result)
        return success_response(result, message='OCR prerequisites OK')


class OcrTrainingBaselineView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        limit = int(request.data.get('limit') or 50)
        result = run_ocr_baseline(limit=limit)
        if not result.get('ok'):
            return error_response('Baseline evaluation failed', errors=result)
        return success_response(result, message='OCR baseline completed')


class OcrTrainingEdgeCasesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        result = run_ocr_edge_cases()
        if not result.get('ok'):
            return error_response('Edge case test failed', errors=result)
        return success_response(result, message='OCR edge cases completed')
