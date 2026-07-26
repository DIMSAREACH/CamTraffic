"""
Explicit YOLO class index → catalog class_key map for the 10-class thesis model.

Must stay in sync with the 10-class thesis weights (ai/weights/best_v2.pt)
and the first 10 names in ai/dataset_10 (see docs/AI-MODEL-STORY.md).

Do NOT apply this map to other weight files (e.g. best_b2_named.pt with 26
named classes) — index 7 is KEEP_RIGHT there, not P_SPEED_LIMIT_50_KM_H.
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

_THESIS_CLASS_COUNT = len(YOLO_CLASS_MAPPING)


def get_yolo_class_mapping() -> dict[int, str]:
    return dict(YOLO_CLASS_MAPPING)


def class_key_for_yolo_id(
    class_id: int,
    *,
    model_class_count: int | None = None,
) -> str | None:
    """
    Map a YOLO class index to a catalog key.

    Only valid for the 10-class thesis model. When the loaded model has a
    different class count, return None so callers use ``model.names`` instead.
    """
    if model_class_count is not None and int(model_class_count) != _THESIS_CLASS_COUNT:
        return None
    return YOLO_CLASS_MAPPING.get(int(class_id))
