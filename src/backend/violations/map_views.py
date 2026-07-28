"""
Real-time Map View API for Violations
Returns violation data with geographic coordinates for map visualization
"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsDriver
from violations.models import TrafficViolation


def _coord(value):
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def extract_violation_coordinates(violation):
    """Resolve lat/lng from camera → road → location string "lat,lng"."""
    camera = getattr(violation, 'camera', None)
    if camera is not None:
        lat = _coord(getattr(camera, 'latitude', None))
        lng = _coord(getattr(camera, 'longitude', None))
        if lat is not None and lng is not None:
            return lat, lng

    road = getattr(violation, 'road', None)
    if road is not None:
        lat = _coord(getattr(road, 'latitude', None))
        lng = _coord(getattr(road, 'longitude', None))
        if lat is not None and lng is not None:
            return lat, lng

    location = (getattr(violation, 'location', None) or '').strip()
    if location and ',' in location:
        try:
            parts = location.split(',')
            if len(parts) == 2:
                lat = float(parts[0].strip())
                lng = float(parts[1].strip())
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
        except (ValueError, AttributeError):
            pass

    return None, None


def calculate_severity(violation):
    severity_map = {
        'speeding': 3,
        'red_light': 4,
        'wrong_way': 4,
        'no_helmet': 2,
        'illegal_parking': 1,
        'dangerous_driving': 5,
    }
    severity = severity_map.get(violation.violation_type, 2)
    fine = getattr(violation, 'fine', None)
    if fine is not None:
        severity = min(5, severity + 1)
    conf = getattr(violation, 'ai_confidence_score', None)
    try:
        if conf is not None and float(conf) > 0.9:
            severity = min(5, severity + 1)
    except (TypeError, ValueError):
        pass
    return severity


class ViolationMapView(APIView):
    """GET /api/violations/map/ — driver-scoped violations with map coordinates."""

    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        violation_status = request.query_params.get('status')
        violation_type = request.query_params.get('violation_type')
        cutoff_date = timezone.now() - timedelta(days=days)

        queryset = TrafficViolation.objects.filter(
            driver__user=request.user,
            violation_date__gte=cutoff_date,
        ).select_related('camera', 'road', 'vehicle', 'fine')

        if violation_status:
            queryset = queryset.filter(status=violation_status)
        if violation_type:
            queryset = queryset.filter(violation_type=violation_type)

        violations = queryset.order_by('-violation_date')[:100]
        map_data = []
        for v in violations:
            lat, lng = extract_violation_coordinates(v)
            if lat is None or lng is None:
                continue
            fine = getattr(v, 'fine', None)
            map_data.append({
                'id': str(v.id),
                'coordinates': {'lat': float(lat), 'lng': float(lng)},
                'type': v.violation_type,
                'status': v.status,
                'date': v.violation_date.isoformat() if v.violation_date else None,
                'location': v.location,
                'detected_sign': v.detected_sign_code,
                'camera_name': v.camera.name if v.camera_id else None,
                'road_name': v.road.name if v.road_id else None,
                'severity': calculate_severity(v),
                'has_fine': fine is not None,
                'fine_amount': float(fine.amount) if fine is not None else None,
                'fine_status': fine.status if fine is not None else None,
            })

        return Response({
            'violations': map_data,
            'total_count': len(map_data),
            'filters': {
                'days': days,
                'status': violation_status,
                'type': violation_type,
            },
            'bounds': self._calculate_bounds(map_data) if map_data else None,
        })

    def _calculate_bounds(self, map_data):
        lats = [v['coordinates']['lat'] for v in map_data]
        lngs = [v['coordinates']['lng'] for v in map_data]
        return {
            'north': max(lats),
            'south': min(lats),
            'east': max(lngs),
            'west': min(lngs),
        }


class ViolationHeatmapView(APIView):
    """GET /api/violations/heatmap/ — driver-scoped heatmap clusters."""

    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        days = int(request.query_params.get('days', 90))
        intensity_type = request.query_params.get('intensity', 'count')
        cutoff_date = timezone.now() - timedelta(days=days)

        violations = TrafficViolation.objects.filter(
            driver__user=request.user,
            violation_date__gte=cutoff_date,
        ).select_related('camera', 'road', 'fine')

        location_clusters = {}
        for v in violations:
            lat, lng = extract_violation_coordinates(v)
            if lat is None or lng is None:
                continue
            cluster_key = (round(lat, 4), round(lng, 4))
            if cluster_key not in location_clusters:
                location_clusters[cluster_key] = {
                    'lat': float(cluster_key[0]),
                    'lng': float(cluster_key[1]),
                    'count': 0,
                    'severity_sum': 0,
                    'violations': [],
                }
            severity = calculate_severity(v)
            location_clusters[cluster_key]['count'] += 1
            location_clusters[cluster_key]['severity_sum'] += severity
            location_clusters[cluster_key]['violations'].append({
                'id': str(v.id),
                'type': v.violation_type,
                'date': v.violation_date.isoformat() if v.violation_date else None,
            })

        heatmap_points = []
        for cluster in location_clusters.values():
            avg_severity = cluster['severity_sum'] / cluster['count'] if cluster['count'] else 1
            intensity = cluster['count'] if intensity_type == 'count' else avg_severity
            heatmap_points.append({
                'lat': cluster['lat'],
                'lng': cluster['lng'],
                'intensity': float(intensity),
                'count': cluster['count'],
                'avg_severity': round(avg_severity, 2),
                'violations': cluster['violations'][:5],
            })

        heatmap_points.sort(key=lambda x: x['intensity'], reverse=True)
        total_violations = sum(p['count'] for p in heatmap_points)
        hotspot = heatmap_points[0] if heatmap_points else None

        return Response({
            'heatmap': heatmap_points,
            'statistics': {
                'total_violations': total_violations,
                'unique_locations': len(heatmap_points),
                'hotspot': hotspot,
                'period_days': days,
            },
            'legend': self._get_heatmap_legend(intensity_type),
        })

    def _get_heatmap_legend(self, intensity_type):
        if intensity_type == 'count':
            return {
                'type': 'count',
                'scale': [
                    {'value': 1, 'color': '#22C55E', 'label': '1 violation'},
                    {'value': 3, 'color': '#EAB308', 'label': '3 violations'},
                    {'value': 5, 'color': '#F97316', 'label': '5+ violations'},
                    {'value': 10, 'color': '#EF4444', 'label': '10+ violations'},
                ],
            }
        return {
            'type': 'severity',
            'scale': [
                {'value': 1, 'color': '#22C55E', 'label': 'Low severity'},
                {'value': 2, 'color': '#84CC16', 'label': 'Medium-low'},
                {'value': 3, 'color': '#EAB308', 'label': 'Medium'},
                {'value': 4, 'color': '#F97316', 'label': 'High'},
                {'value': 5, 'color': '#EF4444', 'label': 'Critical'},
            ],
        }
