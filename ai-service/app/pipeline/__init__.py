"""Detection pipeline orchestration module."""

from app.pipeline.router import router
from app.pipeline.service import PipelineService, pipeline_service

__all__ = ['router', 'PipelineService', 'pipeline_service']
