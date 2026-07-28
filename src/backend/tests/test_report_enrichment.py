"""Report export enrichment must never inject sample/demo KPI floors."""
from dashboard.demo_stats import enrich_report_stats


def test_enrich_report_stats_passes_through_live_only():
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
    assert enriched['total_users'] == 2
    assert enriched['total_fines'] == 0
    assert enriched['total_detections'] == 134
    assert enriched['detection_accuracy'] == 87.0
    assert enriched['monthly_fines'] == []
    assert enriched['fine_by_reason'] == []
    assert enriched['violation_by_type'] == []


def test_enrich_report_stats_empty_live():
    assert enrich_report_stats({}) == {}
    assert enrich_report_stats(None) == {}
