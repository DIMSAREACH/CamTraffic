"""
Explicit YOLO class index → catalog class_key map for the 10-class thesis model.

Must stay in sync with the 10-class thesis weights (ai/weights/best_v2.pt)
and the first 10 names in ai/dataset_10 (see docs/AI-MODEL-STORY.md).
"""
from __future__ import annotations

# Authoritative map — matches dataset_10/data.yaml (verified 2026-06-18)
YOLO_CLASS_MAPPING: dict[int, str] = {
    0: 'NO_ENTRY',
    1: 'NO_LEFT_TURN',
    2: 'NO_RIGHT_TURN',
    3: 'NO_U_TURN',
    4: 'NO_PARKING',
    5: 'M_STOP',
    6: 'P_SPEED_LIMIT_20_KM_H',
    7: 'P_SPEED_LIMIT_50_KM_H',
    8: 'W_PEDESTRIAN_CROSSING',
    9: 'I_ONE_WAY_TRAFFIC',
}


def get_yolo_class_mapping() -> dict[int, str]:
    return dict(YOLO_CLASS_MAPPING)


def class_key_for_yolo_id(class_id: int) -> str | None:
    return YOLO_CLASS_MAPPING.get(int(class_id))
