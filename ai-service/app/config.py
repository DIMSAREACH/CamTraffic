"""AI service configuration loaded from environment."""

import os
from pathlib import Path

from dotenv import load_dotenv

MONOREPO_ROOT = Path(__file__).resolve().parent.parent.parent
SERVICE_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(MONOREPO_ROOT / '.env')
load_dotenv(MONOREPO_ROOT / '.env.local', override=True)
load_dotenv(SERVICE_ROOT / '.env')
load_dotenv(SERVICE_ROOT / '.env.local', override=True)

PORT = int(os.environ.get('AI_SERVICE_PORT', '8001'))
CONFIDENCE_THRESHOLD = float(os.environ.get('AI_CONFIDENCE_THRESHOLD', '0.75'))
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000')
DETECTION_MODE = os.environ.get('AI_DETECTION_MODE', 'auto').strip().lower()
YOLO_DEVICE = os.environ.get('AI_YOLO_DEVICE', 'cpu')
YOLO_WEIGHTS_FILE = os.environ.get('AI_YOLO_WEIGHTS', 'yolov11_camtraffic_v1.pt')
OCR_MODE = os.environ.get('AI_OCR_MODE', 'auto').strip().lower()
OCR_LANGUAGES = tuple(
    language.strip()
    for language in os.environ.get('AI_OCR_LANGUAGES', 'en').split(',')
    if language.strip()
)
PROCESSING_MAX_WIDTH = int(os.environ.get('AI_PROCESSING_MAX_WIDTH', '1280'))
PIPELINE_STORE_RESULTS = os.environ.get('AI_PIPELINE_STORE_RESULTS', 'true').strip().lower() in {
    '1',
    'true',
    'yes',
    'on',
}

_model_path_setting = os.environ.get('AI_MODEL_PATH', 'models')
_model_path = Path(_model_path_setting)
if not _model_path.is_absolute():
    _model_path = SERVICE_ROOT / _model_path

MODEL_PATH = str(_model_path)
_weights_path = Path(YOLO_WEIGHTS_FILE)
YOLO_WEIGHTS_PATH = _weights_path if _weights_path.is_absolute() else _model_path / YOLO_WEIGHTS_FILE

_storage_path = Path(os.environ.get('AI_STORAGE_PATH', 'data/detections'))
STORAGE_DIR = _storage_path if _storage_path.is_absolute() else SERVICE_ROOT / _storage_path
