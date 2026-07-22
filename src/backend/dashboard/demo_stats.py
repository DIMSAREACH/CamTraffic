"""Demo analytics used when the database has no enforcement records (matches frontend mockData)."""

from __future__ import annotations

SAMPLE_MONTHLY_FINES = [
    {'month': 'Jan', 'count': 78, 'revenue': 3900},
    {'month': 'Feb', 'count': 92, 'revenue': 4600},
    {'month': 'Mar', 'count': 104, 'revenue': 5200},
    {'month': 'Apr', 'count': 86, 'revenue': 4300},
    {'month': 'May', 'count': 95, 'revenue': 4750},
    {'month': 'Jun', 'count': 110, 'revenue': 5500},
    {'month': 'Jul', 'count': 88, 'revenue': 4400},
    {'month': 'Aug', 'count': 102, 'revenue': 5100},
    {'month': 'Sep', 'count': 97, 'revenue': 4850},
    {'month': 'Oct', 'count': 115, 'revenue': 5750},
    {'month': 'Nov', 'count': 89, 'revenue': 4450},
    {'month': 'Dec', 'count': 68, 'revenue': 3400},
]

SAMPLE_MONTHLY_DETECTIONS = [
    {'month': 'Jan', 'count': 230}, {'month': 'Feb', 'count': 280}, {'month': 'Mar', 'count': 310},
    {'month': 'Apr', 'count': 285}, {'month': 'May', 'count': 320}, {'month': 'Jun', 'count': 298},
    {'month': 'Jul', 'count': 275}, {'month': 'Aug', 'count': 340}, {'month': 'Sep', 'count': 295},
    {'month': 'Oct', 'count': 365}, {'month': 'Nov', 'count': 288}, {'month': 'Dec', 'count': 170},
]

SAMPLE_MONTHLY_VIOLATIONS = [
    {'month': 'Jan', 'count': 8}, {'month': 'Feb', 'count': 11}, {'month': 'Mar', 'count': 9},
    {'month': 'Apr', 'count': 14}, {'month': 'May', 'count': 12}, {'month': 'Jun', 'count': 10},
    {'month': 'Jul', 'count': 13}, {'month': 'Aug', 'count': 15}, {'month': 'Sep', 'count': 11},
    {'month': 'Oct', 'count': 16}, {'month': 'Nov', 'count': 12}, {'month': 'Dec', 'count': 9},
]

SAMPLE_VIOLATION_BY_TYPE = [
    {'violation_type': 'SPEEDING', 'count': 28},
    {'violation_type': 'NO_STOP', 'count': 22},
    {'violation_type': 'NO_ENTRY', 'count': 19},
    {'violation_type': 'NO_PARKING', 'count': 15},
    {'violation_type': 'NO_LEFT_TURN', 'count': 12},
    {'violation_type': 'NO_U_TURN', 'count': 10},
    {'violation_type': 'NO_RIGHT_TURN', 'count': 8},
    {'violation_type': 'RED_LIGHT', 'count': 6},
]

SAMPLE_FINE_BY_REASON = [
    {'reason': 'Speeding (80km/h in 60km/h zone)', 'count': 198},
    {'reason': 'Running Red Light', 'count': 145},
    {'reason': 'No Helmet (Motorcycle)', 'count': 132},
    {'reason': 'Failure to Stop at Stop Sign (M-032)', 'count': 88},
    {'reason': 'Illegal Parking (R2-10)', 'count': 76},
    {'reason': 'No U-Turn at R1-03', 'count': 54},
    {'reason': 'No Entry (R1-04)', 'count': 48},
    {'reason': 'Speed Limit 20 km/h Exceeded (P-029)', 'count': 41},
]

SAMPLE_USER_DISTRIBUTION = [
    {'role': 'Drivers', 'count': 198},
    {'role': 'Police', 'count': 45},
    {'role': 'Admin', 'count': 5},
]

SAMPLE_DASHBOARD_STATS = {
    'total_users': 248,
    'total_drivers': 198,
    'total_police': 45,
    'total_fines': 1024,
    'paid_fines': 712,
    'pending_fines': 231,
    'total_detections': 3456,
    'total_vehicles': 312,
    'total_signs': 20,
    'total_violations': 86,
    'pending_violations': 12,
    'confirmed_violations': 64,
    'fine_revenue': 48500.0,
    'detection_accuracy': 96.8,
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
    """Merge demo enforcement analytics when live data is sparse (matches frontend mergeDashboardStats)."""
    sample = dict(SAMPLE_DASHBOARD_STATS)

    if not _has_enforcement_data(live):
        merged = {**sample}
        merged['total_detections'] = max(live.get('total_detections') or 0, sample['total_detections'])
        if (live.get('detection_accuracy') or 0) > 0:
            merged['detection_accuracy'] = live['detection_accuracy']
        return merged

    merged = {**live}
    if not _has_chart_series(live.get('monthly_fines')):
        merged['monthly_fines'] = sample['monthly_fines']
    if not _has_chart_series(live.get('monthly_detections')):
        merged['monthly_detections'] = sample['monthly_detections']
    if not _has_chart_series(live.get('monthly_violations')):
        merged['monthly_violations'] = sample['monthly_violations']
    if not live.get('fine_by_reason'):
        merged['fine_by_reason'] = sample['fine_by_reason']
    if not live.get('violation_by_type'):
        merged['violation_by_type'] = sample['violation_by_type']
    if not _has_chart_series(live.get('user_distribution')):
        merged['user_distribution'] = sample['user_distribution']

    for key in (
        'total_users', 'total_drivers', 'total_police', 'total_vehicles', 'total_signs',
        'total_fines', 'paid_fines', 'pending_fines', 'total_violations',
        'pending_violations', 'confirmed_violations', 'fine_revenue',
    ):
        merged[key] = max(live.get(key) or 0, sample.get(key) or 0)

    if (live.get('detection_accuracy') or 0) <= 0:
        merged['detection_accuracy'] = sample['detection_accuracy']

    return merged
