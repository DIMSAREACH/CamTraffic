from unittest.mock import patch

from config.monitoring import get_liveness, get_readiness, get_system_status


def test_liveness_returns_ok_status():
    payload = get_liveness()

    assert payload['status'] == 'ok'
    assert payload['service'] == 'backend'
    assert payload['check'] == 'liveness'


@patch('config.monitoring.check_database', return_value={'status': 'ok', 'latency_ms': 1.0})
@patch('config.monitoring.check_redis', return_value={'status': 'ok', 'latency_ms': 1.0})
def test_readiness_aggregates_dependency_checks(mock_redis, mock_database):
    payload = get_readiness()

    assert payload['status'] == 'ok'
    assert payload['checks']['database']['status'] == 'ok'
    assert payload['checks']['redis']['status'] == 'ok'
    mock_database.assert_called_once()
    mock_redis.assert_called_once()


@patch('config.monitoring.check_database', return_value={'status': 'error', 'latency_ms': 1.0, 'error': 'down'})
@patch('config.monitoring.check_redis', return_value={'status': 'ok', 'latency_ms': 1.0})
def test_system_status_reports_degraded_when_database_fails(mock_redis, mock_database):
    payload = get_system_status()

    assert payload['status'] == 'degraded'
    assert 'environment' in payload
