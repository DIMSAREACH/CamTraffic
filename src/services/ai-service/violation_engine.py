"""Business rules: map detections → suggested traffic violations (Cambodia)."""

from __future__ import annotations

from dataclasses import asdict, dataclass

# Default fine amounts in KHR (illustrative thesis defaults)
DEFAULT_FINES_KHR: dict[str, int] = {
    "STOP_SIGN_VIOLATION": 40_000,
    "SPEEDING": 60_000,
    "NO_ENTRY": 50_000,
    "NO_PARKING": 30_000,
    "WRONG_WAY": 50_000,
    "ILLEGAL_U_TURN": 40_000,
    "RED_LIGHT": 80_000,
    "SCHOOL_ZONE": 50_000,
    "PEDESTRIAN_CROSSING": 40_000,
}


@dataclass
class ViolationSuggestion:
    violation_type: str
    sign_class: str
    confidence: float
    suggested_fine_khr: int
    auto_eligible: bool
    reason: str


def _speed_from_class(sign_class: str) -> int | None:
    mapping = {
        "speed_limit_20": 20,
        "speed_limit_40": 40,
        "speed_limit_60": 60,
        "speed_limit_80": 80,
    }
    return mapping.get(sign_class)


def evaluate_violations(
    signs: list[dict],
    vehicles: list[dict],
    plates: list[dict],
    *,
    observed_speed_kmh: float | None = None,
    min_confidence: float = 0.55,
) -> list[dict]:
    """
    Create violation suggestions from detected signs / context.

    Note: Officer approval is still required in Django before issuing a fine.
    """
    suggestions: list[ViolationSuggestion] = []
    has_vehicle = len(vehicles) > 0
    has_plate = any(p.get("text") for p in plates)

    for sign in signs:
        cls = str(sign.get("class_name", "")).lower()
        conf = float(sign.get("confidence", 0))
        if conf < min_confidence:
            continue

        if cls == "stop" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="STOP_SIGN_VIOLATION",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["STOP_SIGN_VIOLATION"],
                    auto_eligible=conf >= 0.75 and has_plate,
                    reason="Vehicle detected near STOP sign — verify full stop not observed",
                )
            )
        elif cls.startswith("speed_limit_") and has_vehicle:
            limit = _speed_from_class(cls)
            speeding = observed_speed_kmh is not None and limit is not None and observed_speed_kmh > limit
            # Without speed sensor, suggest review when speed-limit sign + vehicle co-occur
            suggestions.append(
                ViolationSuggestion(
                    violation_type="SPEEDING",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["SPEEDING"],
                    auto_eligible=bool(speeding and conf >= 0.75 and has_plate),
                    reason=(
                        f"Observed {observed_speed_kmh} km/h vs limit {limit}"
                        if speeding
                        else f"Speed limit {limit} km/h sign with vehicle — manual speed check required"
                    ),
                )
            )
        elif cls == "no_entry" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="NO_ENTRY",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["NO_ENTRY"],
                    auto_eligible=conf >= 0.75 and has_plate,
                    reason="Vehicle in NO ENTRY zone",
                )
            )
        elif cls == "no_parking" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="NO_PARKING",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["NO_PARKING"],
                    auto_eligible=False,
                    reason="Possible illegal parking — dwell-time confirmation required",
                )
            )
        elif cls == "one_way" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="WRONG_WAY",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["WRONG_WAY"],
                    auto_eligible=False,
                    reason="One-way sign present — verify travel direction",
                )
            )
        elif cls == "u_turn" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="ILLEGAL_U_TURN",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["ILLEGAL_U_TURN"],
                    auto_eligible=False,
                    reason="U-turn restriction context — verify maneuver",
                )
            )
        elif cls == "traffic_light" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="RED_LIGHT",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["RED_LIGHT"],
                    auto_eligible=False,
                    reason="Traffic light present — red-light phase not inferred from still image alone",
                )
            )
        elif cls == "school_zone" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="SCHOOL_ZONE",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["SCHOOL_ZONE"],
                    auto_eligible=False,
                    reason="School zone — verify speed / behavior rules",
                )
            )
        elif cls == "pedestrian_crossing" and has_vehicle:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="PEDESTRIAN_CROSSING",
                    sign_class=cls,
                    confidence=conf,
                    suggested_fine_khr=DEFAULT_FINES_KHR["PEDESTRIAN_CROSSING"],
                    auto_eligible=False,
                    reason="Crossing zone — verify failure to yield",
                )
            )

    # Deduplicate by violation_type keeping highest confidence
    best: dict[str, ViolationSuggestion] = {}
    for s in suggestions:
        prev = best.get(s.violation_type)
        if prev is None or s.confidence > prev.confidence:
            best[s.violation_type] = s

    return [asdict(v) for v in best.values()]


def overall_confidence(signs: list[dict], vehicles: list[dict], plates: list[dict]) -> float:
    scores = [
        float(x.get("confidence", 0))
        for x in (*signs, *vehicles, *plates)
        if x.get("confidence") is not None
    ]
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 4)
