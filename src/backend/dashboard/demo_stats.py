"""Demo analytics used when the database has no enforcement records (matches frontend mockData)."""

from __future__ import annotations

SAMPLE_MONTHLY_FINES = [
    {'month': 'Feb', 'count': 142, 'revenue': 3120},
    {'month': 'Mar', 'count': 168, 'revenue': 3680},
    {'month': 'Apr', 'count': 186, 'revenue': 4120},
    {'month': 'May', 'count': 210, 'revenue': 4680},
    {'month': 'Jun', 'count': 248, 'revenue': 5420},
    {'month': 'Jul', 'count': 286, 'revenue': 6280},
]

SAMPLE_MONTHLY_DETECTIONS = [
    {'month': 'Feb', 'count': 520}, {'month': 'Mar', 'count': 610}, {'month': 'Apr', 'count': 690},
    {'month': 'May', 'count': 780}, {'month': 'Jun', 'count': 860}, {'month': 'Jul', 'count': 980},
]

SAMPLE_MONTHLY_VIOLATIONS = [
    {'month': 'Feb', 'count': 86}, {'month': 'Mar', 'count': 104}, {'month': 'Apr', 'count': 122},
    {'month': 'May', 'count': 148}, {'month': 'Jun', 'count': 176}, {'month': 'Jul', 'count': 214},
]

SAMPLE_VIOLATION_BY_TYPE = [
    {'violation_type': 'SPEEDING', 'count': 214},
    {'violation_type': 'NO_PARKING', 'count': 168},
    {'violation_type': 'ILLEGAL_LEFT_TURN', 'count': 142},
    {'violation_type': 'NO_ENTRY', 'count': 128},
    {'violation_type': 'ILLEGAL_U_TURN', 'count': 116},
    {'violation_type': 'RED_LIGHT', 'count': 98},
]

SAMPLE_FINE_BY_REASON = [
    {'reason': 'Speeding', 'count': 214},
    {'reason': 'No Parking', 'count': 168},
    {'reason': 'Illegal Left Turn', 'count': 142},
    {'reason': 'No Entry', 'count': 128},
    {'reason': 'Illegal U-Turn', 'count': 116},
    {'reason': 'Running Red Light', 'count': 98},
]

SAMPLE_USER_DISTRIBUTION = [
    {'role': 'Drivers', 'count': 348},
    {'role': 'Police', 'count': 56},
    {'role': 'Admin', 'count': 8},
]

SAMPLE_DASHBOARD_STATS = {
    'total_users': 412,
    'total_drivers': 348,
    'total_police': 56,
    'total_fines': 1860,
    'paid_fines': 1244,
    'pending_fines': 412,
    'total_detections': 5280,
    'total_vehicles': 1260,
    'total_signs': 412,
    'total_violations': 980,
    'pending_violations': 146,
    'confirmed_violations': 712,
    'fine_revenue': 42800.0,
    'detection_accuracy': 94.6,
    'monthly_fines': SAMPLE_MONTHLY_FINES,
    'monthly_detections': SAMPLE_MONTHLY_DETECTIONS,
    'monthly_violations': SAMPLE_MONTHLY_VIOLATIONS,
    'violation_by_type': SAMPLE_VIOLATION_BY_TYPE,
    'fine_by_reason': SAMPLE_FINE_BY_REASON,
    'user_distribution': SAMPLE_USER_DISTRIBUTION,
}

# Sample enforcement rows for Excel when the DB has no records for the selected month.
SAMPLE_EXCEL_FINES = [
    {
        'issued': '2026-06-15 14:20',
        'driver': 'Kosal Pich',
        'license': 'DL-KH-2024-001234',
        'amount': 100.0,
        'reason': 'Speeding (80km/h in 60km/h zone)',
        'status': 'pending',
        'location': 'Russian Blvd, Phnom Penh',
        'plate': '2AK 7788',
        'officer': 'Dara Chan',
        'paid_at': '',
    },
    {
        'issued': '2026-06-08 11:00',
        'driver': 'Kosal Pich',
        'license': 'DL-KH-2024-001234',
        'amount': 25.0,
        'reason': 'Failure to Stop at Stop Sign (M-032)',
        'status': 'pending',
        'location': 'Confederation de la Russie Blvd, Phnom Penh',
        'plate': '2AK 7788',
        'officer': 'Dara Chan',
        'paid_at': '',
    },
    {
        'issued': '2026-06-10 08:30',
        'driver': 'Kosal Pich',
        'license': 'DL-KH-2024-001234',
        'amount': 30.0,
        'reason': 'No U-Turn at R1-03',
        'status': 'pending',
        'location': 'Sihanouk Blvd, Phnom Penh',
        'plate': '2AA 1234',
        'officer': 'Dara Chan',
        'paid_at': '',
    },
    {
        'issued': '2026-06-02 10:00',
        'driver': 'Vanna Sok',
        'license': 'DL-KH-2024-002345',
        'amount': 25.0,
        'reason': 'Failure to Stop at Stop Sign (M-032)',
        'status': 'paid',
        'location': 'Monivong Blvd, Phnom Penh',
        'plate': '1CC 9012',
        'officer': 'Srey Neang',
        'paid_at': '2026-06-03 09:00',
    },
    {
        'issued': '2026-06-12 09:00',
        'driver': 'Pisey Mao',
        'license': 'DL-KH-2024-003456',
        'amount': 15.0,
        'reason': 'Illegal Parking (R2-10)',
        'status': 'paid',
        'location': 'Central Market, Phnom Penh',
        'plate': '2BB 5566',
        'officer': 'Srey Neang',
        'paid_at': '2026-06-13 10:00',
    },
    {
        'issued': '2026-06-18 14:00',
        'driver': 'Vanna Sok',
        'license': 'DL-KH-2024-002345',
        'amount': 10.0,
        'reason': 'No Helmet (Motorcycle)',
        'status': 'paid',
        'location': 'Street 271, Sen Sok',
        'plate': '1CC 9012',
        'officer': 'Dara Chan',
        'paid_at': '2026-06-19 08:00',
    },
]

SAMPLE_EXCEL_VIOLATIONS = [
    {
        'date': '2026-06-08 11:05',
        'driver': 'Kosal Pich',
        'license': 'DL-KH-2024-001234',
        'violation_type': 'NO_STOP',
        'observed_action': 'ENTER',
        'sign_code': 'M-032',
        'class_key': 'M_STOP',
        'location': 'Confederation de la Russie Blvd, Phnom Penh',
        'status': 'confirmed',
        'plate': '2AA 1234',
        'officer': 'Dara Chan',
    },
    {
        'date': '2026-06-10 08:35',
        'driver': 'Chenda Ros',
        'license': 'DL-KH-2024-006789',
        'violation_type': 'NO_U_TURN',
        'observed_action': 'U_TURN',
        'sign_code': 'R1-03',
        'class_key': 'NO_U_TURN',
        'location': 'Sihanouk Blvd, Phnom Penh',
        'status': 'pending_review',
        'plate': '3FF 2345',
        'officer': 'Dara Chan',
    },
    {
        'date': '2026-06-14 08:05',
        'driver': 'Vanna Sok',
        'license': 'DL-KH-2024-002345',
        'violation_type': 'SPEEDING',
        'observed_action': 'ENTER',
        'sign_code': 'P-030',
        'class_key': 'P_SPEED_LIMIT_50_KM_H',
        'location': 'Airport Road, Phnom Penh',
        'status': 'pending_review',
        'plate': '1CC 9012',
        'officer': 'Srey Neang',
    },
]


def _has_enforcement_data(stats: dict) -> bool:
    if (stats.get('total_fines') or 0) > 0:
        return True
    if (stats.get('fine_revenue') or 0) > 0:
        return True
    if (stats.get('total_violations') or 0) > 0:
        return True
    monthly = stats.get('monthly_fines') or []
    if any((row.get('count') or 0) > 0 for row in monthly):
        return True
    reasons = stats.get('fine_by_reason') or []
    if any((row.get('count') or 0) > 0 for row in reasons):
        return True
    return False


def _has_chart_series(rows: list | None) -> bool:
    return any((row.get('count') or 0) > 0 for row in (rows or []))


def enrich_report_stats(live: dict) -> dict:
    """Pass through live stats only — never inflate with SAMPLE_DASHBOARD_STATS.

    Kept as a named hook so PDF/export views stay stable; production reports must
    reflect the database, not demo floors (e.g. 412 users).
    """
    return dict(live) if live else {}
