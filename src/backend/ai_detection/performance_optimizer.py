"""
AI Detection Performance Optimizer
Improves detection speed and smoothness with smart configurations.
"""
import logging
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)

# Optimized image sizes for different scenarios
IMGSZ_PRESETS = {
    'fast': 320,      # ~40% faster, good for live/webcam
    'balanced': 416,  # Default - good speed/accuracy balance
    'quality': 640,   # Best accuracy, slower
}

def get_optimal_imgsz(image_path: str | Path, priority: str = 'balanced') -> int:
    """
    Determine optimal YOLO image size based on input image dimensions.
    
    Args:
        image_path: Path to the image
        priority: 'fast', 'balanced', or 'quality'
    
    Returns:
        Optimal imgsz value
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            max_dim = max(width, height)
            
            # For small images, use smaller imgsz
            if max_dim <= 640:
                return IMGSZ_PRESETS['fast']
            
            # For medium images, use balanced
            if max_dim <= 1280:
                return IMGSZ_PRESETS['balanced']
            
            # For large images, still use balanced unless quality requested
            if priority == 'quality':
                return IMGSZ_PRESETS['quality']
            
            return IMGSZ_PRESETS['balanced']
    
    except Exception as exc:
        logger.debug(f"Could not determine optimal imgsz: {exc}")
        return IMGSZ_PRESETS.get(priority, 416)


def optimize_yolo_kwargs(
    *,
    imgsz: int | None = None,
    conf: float = 0.35,
    iou: float = 0.45,
    fast_mode: bool = False,
) -> dict:
    """
    Generate optimized YOLO prediction kwargs.
    
    Args:
        imgsz: Image size (will use optimal if None)
        conf: Confidence threshold
        iou: IOU threshold for NMS
        fast_mode: Enable fast inference optimizations
    
    Returns:
        Dict of YOLO prediction kwargs
    """
    kwargs = {
        'conf': conf,
        'iou': iou,
        'verbose': False,
        'agnostic_nms': False,  # Faster NMS
        'max_det': 100,  # Limit max detections for speed
    }
    
    if imgsz:
        kwargs['imgsz'] = imgsz
    
    if fast_mode:
        # Fast mode optimizations
        kwargs['conf'] = max(conf, 0.4)  # Higher threshold = fewer false positives to process
        kwargs['max_det'] = 50  # Reduce max detections
        kwargs['agnostic_nms'] = True  # Slightly faster
    
    return kwargs


def preprocess_image_fast(image_path: str | Path, max_size: int = 1920) -> str | Path:
    """
    Fast image preprocessing for detection.
    Resizes large images to reduce processing time.
    
    Args:
        image_path: Path to input image
        max_size: Maximum dimension (width or height)
    
    Returns:
        Path to processed image (same as input if no processing needed)
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            max_dim = max(width, height)
            
            # No need to resize if already small
            if max_dim <= max_size:
                return image_path
            
            # Calculate new dimensions
            scale = max_size / max_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            # Resize with high-quality downsampling
            resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to temp location
            output_path = Path(image_path).parent / f"optimized_{Path(image_path).name}"
            resized.save(output_path, quality=95, optimize=True)
            
            logger.debug(f"Resized {width}x{height} → {new_width}x{new_height} for faster processing")
            return str(output_path)
    
    except Exception as exc:
        logger.debug(f"Image preprocessing skipped: {exc}")
        return image_path


def get_detection_strategy(
    *,
    image_size: tuple[int, int] | None = None,
    live_mode: bool = False,
    priority: str = 'balanced',
) -> dict:
    """
    Get optimized detection strategy based on context.
    
    Args:
        image_size: (width, height) tuple
        live_mode: True for live/webcam detection
        priority: 'fast', 'balanced', or 'quality'
    
    Returns:
        Dict with detection strategy parameters
    """
    if live_mode:
        # Live camera needs speed
        return {
            'imgsz': 320,
            'conf': 0.4,
            'fast_mode': True,
            'enable_visual_match': False,
            'enable_ocr': True,
        }
    
    if priority == 'fast':
        return {
            'imgsz': 320,
            'conf': 0.35,
            'fast_mode': True,
            'enable_visual_match': True,
            'enable_ocr': True,
        }
    
    if priority == 'quality':
        return {
            'imgsz': 640,
            'conf': 0.25,
            'fast_mode': False,
            'enable_visual_match': True,
            'enable_ocr': True,
        }
    
    # Balanced (default)
    return {
        'imgsz': 416,
        'conf': 0.35,
        'fast_mode': False,
        'enable_visual_match': True,
        'enable_ocr': True,
    }
