"""Report export enrichment when enforcement data is sparse."""
from dashboard.demo_stats import enrich_report_stats


def test_enrich_report_stats_fills_empty_enforcement():
    live = {
        'total_users': 2,
        'total_drivers': 1,
        'total_police': 0,
        'total_fines': 0,
        'paid_fines': 0,
        'pending_fines': 0,
        'total_detections': 134,
        'total_vehicles': 0,
        'total_signs': 0,
        'total_violations': 0,
        'fine_revenue': 0,
        'detection_accuracy': 87.0,
        'monthly_fines': [],
        'fine_by_reason': [],
        'violation_by_type': [],
    }
    enriched = enrich_report_stats(live)
    assert enriched['total_fines'] == 1024
    assert enriched['monthly_fines']
    assert any(row['count'] > 0 for row in enriched['monthly_fines'])
    assert enriched['fine_by_reason']
    assert enriched['violation_by_type']
    assert enriched['detection_accuracy'] == 87.0
