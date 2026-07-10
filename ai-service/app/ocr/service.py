"""EasyOCR license plate and text recognition service."""

from __future__ import annotations

import re
import time
from io import BytesIO

import numpy as np
from PIL import Image

from app.config import OCR_LANGUAGES
from app.ocr.model_loader import easyocr_available, get_reader, is_ready, ocr_status_message, should_use_mock
from app.ocr.schemas import OCRResponse, OCRStatusResponse, OCRTextItem, PlateOCRResponse

PLATE_PATTERN = re.compile(r'^[A-Z0-9][A-Z0-9\-\s]{2,12}$', re.IGNORECASE)

# Cambodian license plate extraction patterns (priority order).
# EasyOCR often returns surrounding text (Khmer border characters) concatenated
# with the actual plate number. These patterns extract the plate substring.
_KH_PLATE_PATTERNS: list[re.Pattern[str]] = [
    # Standard private/govt: digit + 1-3 letters + separator + 3-7 digits/chars
    # e.g. 2A-1234, 2AB.5678, 2BV-4081, 2AX.98464
    re.compile(r'[1-9][A-Z]{1,3}[-.:,/\\][0-9]{3,7}[A-Z0-9]*', re.IGNORECASE),
    # Numeric-heavy plates: starts with digit, separator optional, 5+ chars
    # e.g. 288-00837, 28K25367, 281.54631
    re.compile(r'[1-9][A-Z0-9]{1,2}[-.:,]?[0-9]{3,6}', re.IGNORECASE),
    # Short plates with clear separator: e.g. 3C-460, 2P.907, 2R.2094
    re.compile(r'[A-Z0-9]{1,3}[-.:,][0-9]{3,6}[A-Z0-9/|\\]*', re.IGNORECASE),
    # Fallback: any 4-12 char alphanumeric+separator block
    re.compile(r'[A-Z0-9][A-Z0-9\-.:,]{3,11}', re.IGNORECASE),
]

# Characters that are commonly noise at the edges of OCR output.
_EDGE_NOISE = re.compile(r'^[^A-Z0-9]*|[^A-Z0-9|]*$', re.IGNORECASE)


class OCRService:
    def status(self) -> OCRStatusResponse:
        mode = 'mock' if should_use_mock() else 'ocr'
        return OCRStatusResponse(
            ready=is_ready(),
            mode=mode,
            easyocr_available=easyocr_available(),
            languages=list(OCR_LANGUAGES),
            message=ocr_status_message(),
        )

    def recognize_text(self, image_bytes: bytes) -> OCRResponse:
        started = time.perf_counter()
        if should_use_mock():
            texts = [OCRTextItem(text='MOCK-TEXT', confidence=0.87)]
            mode = 'mock'
        else:
            texts = self._run_easyocr(image_bytes)
            mode = 'ocr'

        primary = texts[0] if texts else OCRTextItem(text='', confidence=0.0)
        inference_ms = (time.perf_counter() - started) * 1000
        return OCRResponse(
            mode=mode,
            texts=texts,
            primary_text=primary.text,
            primary_confidence=primary.confidence,
            inference_ms=round(inference_ms, 2),
        )

    def recognize_plate(self, image_bytes: bytes) -> PlateOCRResponse:
        ocr_result = self.recognize_text(image_bytes)
        plate_text = self._normalize_plate(ocr_result.primary_text)
        if should_use_mock() and not plate_text:
            plate_text = '2A-1234'
            confidence = 0.88
        else:
            confidence = ocr_result.primary_confidence

        return PlateOCRResponse(
            mode=ocr_result.mode,
            plate_text=plate_text,
            confidence=round(confidence, 4),
            inference_ms=ocr_result.inference_ms,
        )

    def _run_easyocr(self, image_bytes: bytes) -> list[OCRTextItem]:
        loaded = get_reader()
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        results = loaded.reader.readtext(np.array(image), detail=1, paragraph=False)

        texts: list[OCRTextItem] = []
        for _bbox, text, confidence in results:
            cleaned = str(text).strip()
            if not cleaned:
                continue
            texts.append(
                OCRTextItem(
                    text=cleaned,
                    confidence=round(float(confidence), 4),
                )
            )

        texts.sort(key=lambda item: item.confidence, reverse=True)
        return texts

    @staticmethod
    def _normalize_plate(text: str) -> str:
        cleaned = re.sub(r'\s+', '', text.upper())

        # Fast path: already looks like a clean plate.
        if PLATE_PATTERN.match(cleaned):
            return cleaned

        # Try extracting a plate-like substring from surrounding OCR garbage.
        extracted = OCRService._extract_plate_substring(cleaned)
        if extracted:
            return extracted[:20]

        # Final fallback: strip obvious edge noise and truncate.
        stripped = _EDGE_NOISE.sub('', cleaned)
        return (stripped or cleaned)[:20]

    @staticmethod
    def _extract_plate_substring(text: str) -> str:
        """Extract the most plate-like substring from raw OCR text.

        EasyOCR frequently returns Khmer border characters concatenated with
        the actual plate number.  This method tries progressively looser
        regex patterns and returns the longest match.
        """
        best = ''
        for pattern in _KH_PLATE_PATTERNS:
            matches = pattern.findall(text)
            if matches:
                candidate = max(matches, key=len)
                if len(candidate) > len(best):
                    best = candidate
            if best and len(best) >= 5:
                break
        return best


ocr_service = OCRService()
