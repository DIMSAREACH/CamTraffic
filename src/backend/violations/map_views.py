"""
Real-time Map View API for Violations
Returns violation data with geographic coordinates for map visualization
"""
from decimal import Decimal

from django.db.models import Count, Q, Avg
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsDriver
from violations.models import TrafficViolation
from violations.serializers import TrafficViolationSerializer


class ViolationMapView(APIView):
    """
    Get violations for map visualization
    
    GET /api/violations/map/
    
    Query params:
        - user_id: Filter by driver (default: current user)
        - days: Number of days to look back (default: 30)
        - status: Filter by status
        - violation_type: Filter by type
    
    Returns:
        List of violations with coordinates for mapping
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def get(self, request):
        # Drivers only see their own violations (TrafficViolation.driver → Driver profile)
        days = int(request.query_params.get('days', 30))
        violation_status = request.query_params.get('status')
        violation_type = request.query_params.get('violation_type')
        
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        queryset = TrafficViolation.objects.filter(
            driver__user=request.user,
            violation_date__gte=cutoff_date,
        ).select_related('camera', 'road', 'vehicle', 'fine')
        
        if violation_status:
            queryset = queryset.filter(status=violation_status)
        
        if violation_type:
            queryset = queryset.filter(violation_type=violation_type)
        
        # Get violations with coordinates
        violations = queryset.order_by('-violation_date')[:100]  # Limit to 100 for performance
        
        # Format for map display
        map_data = []
        for v in violations:
            # Get coordinates from camera location
            lat, lng = self._extract_coordinates(v)
            
            if lat and lng:
                map_data.append({
                    'id': str(v.id),
                    'coordinates': {
                        'lat': float(lat),
                        'lng': float(lng),
                    },
                    'type': v.violation_type,
                    'status': v.status,
                    'date': v.violation_date.isoformat(),
                    'location': v.location,
                    'detected_sign': v.detected_sign_code,
                    'camera_name': v.camera.name if v.camera else None,
                    'road_name': v.road.name if v.road else None,
                    'severity': self._calculate_severity(v),
                    'has_fine': hasattr(v, 'fine') and v.fine is not None,
                    'fine_amount': float(v.fine.amount) if hasattr(v, 'fine') and v.fine else None,
                    'fine_status': v.fine.status if hasattr(v, 'fine') and v.fine else None,
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
    
    def _extract_coordinates(self, violation):
        """Extract latitude and longitude from violation"""
        # Priority: violation GPS > camera GPS > road GPS
        
        # 1. Check if violation has GPS coordinates
        if hasattr(violation, 'gps_latitude') and violation.gps_latitude:
            return violation.gps_latitude, violation.gps_longitude
        
        # 2. Check camera location
        if violation.camera and violation.camera.gps_latitude:
            return violation.camera.gps_latitude, violation.camera.gps_longitude
        
        # 3. Check road location
        if violation.road and hasattr(violation.road, 'gps_latitude') and violation.road.gps_latitude:
            return violation.road.gps_latitude, violation.road.gps_longitude
        
        # 4. Parse from location string if it's formatted as "lat,lng"
        if violation.location and ',' in violation.location:
            try:
                parts = violation.location.split(',')
                if len(parts) == 2:
                    lat = float(parts[0].strip())
                    lng = float(parts[1].strip())
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        return lat, lng
            except (ValueError, AttributeError):
                pass
        
        # 5. Default to Phnom Penh center if no coordinates
        # (In production, you might want to geocode the location address)
        return None, None
    
    def _calculate_severity(self, violation):
        """Calculate severity score (1-5) based on violation characteristics"""
        severity = 1
        
        # Base severity by type
        severity_map = {
            'speeding': 3,
            'red_light': 4,
            'wrong_way': 4,
            'no_helmet': 2,
            'illegal_parking': 1,
            'dangerous_driving': 5,
        }
        severity = severity_map.get(violation.violation_type, 2)
        
        # Increase if has fine
        if hasattr(violation, 'fine') and violation.fine:
            severity = min(5, severity + 1)
        
        # Increase based on AI confidence
        if violation.ai_confidence_score and float(violation.ai_confidence_score) > 0.9:
            severity = min(5, severity + 1)
        
        return severity
    
    def _calculate_bounds(self, map_data):
        """Calculate map bounds from violation coordinates"""
        if not map_data:
            return None
        
        lats = [v['coordinates']['lat'] for v in map_data]
        lngs = [v['coordinates']['lng'] for v in map_data]
        
        return {
            'north': max(lats),
            'south': min(lats),
            'east': max(lngs),
            'west': min(lngs),
        }


class ViolationHeatmapView(APIView):
    """
    Get violation heatmap data for driver
    
    GET /api/violations/heatmap/
    
    Query params:
        - days: Number of days to look back (default: 90)
        - intensity: 'count' or 'severity' (default: count)
    
    Returns:
        Heatmap data with violation density and severity
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def get(self, request):
        days = int(request.query_params.get('days', 90))
        intensity_type = request.query_params.get('intensity', 'count')
        
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        violations = TrafficViolation.objects.filter(
            driver__user=request.user,
            violation_date__gte=cutoff_date,
        ).select_related('camera', 'road', 'fine')
        
        # Group by location/coordinates
        heatmap_points = []
        location_clusters = {}
        
        for v in violations:
            lat, lng = self._extract_coordinates(v)
            
            if lat and lng:
                # Round to 4 decimal places to cluster nearby violations
                cluster_key = (round(lat, 4), round(lng, 4))
                
                if cluster_key not in location_clusters:
                    location_clusters[cluster_key] = {
                        'lat': float(cluster_key[0]),
                        'lng': float(cluster_key[1]),
                        'count': 0,
                        'severity_sum': 0,
                        'violations': [],
                    }
                
                severity = self._calculate_severity(v)
                location_clusters[cluster_key]['count'] += 1
                location_clusters[cluster_key]['severity_sum'] += severity
                location_clusters[cluster_key]['violations'].append({
                    'id': str(v.id),
                    'type': v.violation_type,
                    'date': v.violation_date.isoformat(),
                })
        
        # Format heatmap data
        for cluster in location_clusters.values():
            avg_severity = cluster['severity_sum'] / cluster['count'] if cluster['count'] > 0 else 1
            
            intensity = cluster['count'] if intensity_type == 'count' else avg_severity
            
            heatmap_points.append({
                'lat': cluster['lat'],
                'lng': cluster['lng'],
                'intensity': float(intensity),
                'count': cluster['count'],
                'avg_severity': round(avg_severity, 2),
                'violations': cluster['violations'][:5],  # Sample of violations
            })
        
        # Sort by intensity (highest first)
        heatmap_points.sort(key=lambda x: x['intensity'], reverse=True)
        
        # Calculate statistics
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
    
    def _extract_coordinates(self, violation):
        """Same as ViolationMapView"""
        if hasattr(violation, 'gps_latitude') and violation.gps_latitude:
            return violation.gps_latitude, violation.gps_longitude
        
        if violation.camera and violation.camera.gps_latitude:
            return violation.camera.gps_latitude, violation.camera.gps_longitude
        
        if violation.road and hasattr(violation.road, 'gps_latitude') and violation.road.gps_latitude:
            return violation.road.gps_latitude, violation.road.gps_longitude
        
        return None, None
    
    def _calculate_severity(self, violation):
        """Same as ViolationMapView"""
        severity_map = {
            'speeding': 3,
            'red_light': 4,
            'wrong_way': 4,
            'no_helmet': 2,
            'illegal_parking': 1,
            'dangerous_driving': 5,
        }
        return severity_map.get(violation.violation_type, 2)
    
    def _get_heatmap_legend(self, intensity_type):
        """Get legend for heatmap colors"""
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
        else:
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
