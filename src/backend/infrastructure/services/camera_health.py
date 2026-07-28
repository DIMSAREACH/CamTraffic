"""
Camera health monitoring service for production RTSP cameras.
Provides health checks, connectivity monitoring, and status updates.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import subprocess
import socket
import requests
from urllib.parse import urlparse

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from infrastructure.models import Camera

logger = logging.getLogger(__name__)


class CameraHealthMonitor:
    """Monitor camera health and connectivity for production deployment."""
    
    def __init__(self):
        self.timeout = 10  # seconds for network operations
        self.rtsp_timeout = 5
        
    def check_all_cameras(self) -> Dict[str, any]:
        """Check health of all active cameras."""
        cameras = Camera.objects.filter(
            status__in=['active', 'offline'],
            is_disabled=False
        )
        
        results = {
            'total_cameras': cameras.count(),
            'healthy_cameras': 0,
            'unhealthy_cameras': 0,
            'offline_cameras': 0,
            'camera_details': [],
            'checked_at': timezone.now().isoformat()
        }
        
        for camera in cameras:
            health_status = self.check_camera_health(camera)
            results['camera_details'].append(health_status)
            
            if health_status['is_healthy']:
                results['healthy_cameras'] += 1
            elif health_status['status'] == 'offline':
                results['offline_cameras'] += 1
            else:
                results['unhealthy_cameras'] += 1
                
            # Update camera status in database
            self.update_camera_status(camera, health_status)
        
        logger.info(f"Camera health check completed: {results['healthy_cameras']}/{results['total_cameras']} healthy")
        return results
    
    def check_camera_health(self, camera: Camera) -> Dict[str, any]:
        """Comprehensive health check for a single camera."""
        result = {
            'id': str(camera.id),
            'name': camera.name,
            'code': camera.code,
            'location': f"{camera.road.name}",
            'current_status': camera.status,
            'is_healthy': False,
            'status': 'unknown',
            'checks': {},
            'last_check': timezone.now().isoformat(),
            'response_time_ms': None,
            'error_message': None
        }
        
        try:
            # Network connectivity check
            network_check = self.check_network_connectivity(camera)
            result['checks']['network'] = network_check
            
            # HTTP snapshot check (if available)
            if camera.frame_source_url and camera.frame_source_url.startswith('http'):
                http_check = self.check_http_snapshot(camera.frame_source_url)
                result['checks']['http_snapshot'] = http_check
            
            # RTSP stream check
            if camera.rtsp_url:
                rtsp_check = self.check_rtsp_stream(camera.rtsp_url)
                result['checks']['rtsp_stream'] = rtsp_check
            
            # ONVIF check (if enabled)
            if camera.onvif_enabled and camera.ip_address:
                onvif_check = self.check_onvif_service(camera)
                result['checks']['onvif'] = onvif_check
            
            # Determine overall health status
            result['is_healthy'] = self.determine_health_status(result['checks'])
            result['status'] = 'healthy' if result['is_healthy'] else 'unhealthy'
            
            # Calculate average response time
            response_times = [
                check.get('response_time_ms') 
                for check in result['checks'].values() 
                if check.get('response_time_ms') is not None
            ]
            if response_times:
                result['response_time_ms'] = sum(response_times) / len(response_times)
                
        except Exception as e:
            result['status'] = 'error'
            result['error_message'] = str(e)
            logger.error(f"Error checking camera {camera.code}: {e}")
        
        return result
    
    def check_network_connectivity(self, camera: Camera) -> Dict[str, any]:
        """Check basic network connectivity to camera IP."""
        if not camera.ip_address:
            return {'status': 'skipped', 'reason': 'No IP address configured'}
        
        start_time = datetime.now()
        
        try:
            # Try to establish a connection to the camera's port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((camera.ip_address, camera.port or 554))
            sock.close()
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if result == 0:
                return {
                    'status': 'success',
                    'response_time_ms': response_time,
                    'message': f'Connected to {camera.ip_address}:{camera.port}'
                }
            else:
                return {
                    'status': 'failure',
                    'response_time_ms': response_time,
                    'message': f'Cannot connect to {camera.ip_address}:{camera.port}'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Network check failed: {str(e)}'
            }
    
    def check_http_snapshot(self, snapshot_url: str) -> Dict[str, any]:
        """Check HTTP snapshot endpoint availability."""
        start_time = datetime.now()
        
        try:
            response = requests.get(
                snapshot_url,
                timeout=self.timeout,
                headers={'User-Agent': 'CamTraffic-HealthMonitor/1.0'}
            )
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    return {
                        'status': 'success',
                        'response_time_ms': response_time,
                        'message': f'Snapshot OK ({len(response.content)} bytes)',
                        'content_type': content_type
                    }
                else:
                    return {
                        'status': 'warning',
                        'response_time_ms': response_time,
                        'message': f'Response not an image: {content_type}'
                    }
            else:
                return {
                    'status': 'failure',
                    'response_time_ms': response_time,
                    'message': f'HTTP {response.status_code}: {response.reason}'
                }
                
        except requests.RequestException as e:
            return {
                'status': 'error',
                'message': f'HTTP request failed: {str(e)}'
            }
    
    def check_rtsp_stream(self, rtsp_url: str) -> Dict[str, any]:
        """Check RTSP stream availability using ffprobe."""
        start_time = datetime.now()
        
        try:
            # Use ffprobe to check RTSP stream
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_streams',
                '-timeout', str(self.rtsp_timeout * 1000000),  # microseconds
                rtsp_url
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.rtsp_timeout + 2
            )
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if result.returncode == 0:
                return {
                    'status': 'success',
                    'response_time_ms': response_time,
                    'message': 'RTSP stream accessible'
                }
            else:
                error_msg = result.stderr.strip() if result.stderr else 'Unknown error'
                return {
                    'status': 'failure',
                    'response_time_ms': response_time,
                    'message': f'RTSP check failed: {error_msg}'
                }
                
        except subprocess.TimeoutExpired:
            return {
                'status': 'timeout',
                'message': f'RTSP check timed out after {self.rtsp_timeout}s'
            }
        except FileNotFoundError:
            return {
                'status': 'error',
                'message': 'ffprobe not found - install FFmpeg for RTSP monitoring'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'RTSP check error: {str(e)}'
            }
    
    def check_onvif_service(self, camera: Camera) -> Dict[str, any]:
        """Check ONVIF service availability (basic port check)."""
        if not camera.ip_address:
            return {'status': 'skipped', 'reason': 'No IP address'}
        
        # ONVIF typically runs on port 80 or 8080
        onvif_ports = [80, 8080, 8899]
        
        for port in onvif_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(3)
                result = sock.connect_ex((camera.ip_address, port))
                sock.close()
                
                if result == 0:
                    return {
                        'status': 'success',
                        'message': f'ONVIF service detected on port {port}',
                        'port': port
                    }
            except Exception:
                continue
        
        return {
            'status': 'failure',
            'message': 'No ONVIF service found on common ports'
        }
    
    def determine_health_status(self, checks: Dict[str, Dict]) -> bool:
        """Determine overall camera health from individual checks."""
        # Camera is healthy if at least one of network/http/rtsp succeeds
        critical_checks = ['network', 'http_snapshot', 'rtsp_stream']
        
        for check_name in critical_checks:
            if check_name in checks:
                check_result = checks[check_name]
                if check_result.get('status') == 'success':
                    return True
        
        return False
    
    def update_camera_status(self, camera: Camera, health_result: Dict[str, any]):
        """Update camera status in database based on health check."""
        now = timezone.now()
        
        # Determine new status
        if health_result['is_healthy']:
            new_status = 'active'
        elif health_result['status'] == 'timeout':
            new_status = 'offline'
        else:
            new_status = 'offline'
        
        # Only update if status changed or it's been more than 5 minutes since last ping
        should_update = (
            camera.status != new_status or
            not camera.last_ping or
            (now - camera.last_ping) > timedelta(minutes=5)
        )
        
        if should_update:
            with transaction.atomic():
                camera.status = new_status
                camera.last_ping = now
                if health_result.get('response_time_ms'):
                    # Store response time in description for now
                    camera.description = f"Last response: {health_result['response_time_ms']:.1f}ms"
                camera.save(update_fields=['status', 'last_ping', 'description'])
            
            logger.info(f"Updated camera {camera.code} status: {new_status}")


def run_camera_health_check() -> Dict[str, any]:
    """Entry point for camera health monitoring."""
    monitor = CameraHealthMonitor()
    return monitor.check_all_cameras()


def check_camera_connectivity(camera_id: str) -> Dict[str, any]:
    """Check connectivity for a specific camera."""
    try:
        camera = Camera.objects.get(id=camera_id)
        monitor = CameraHealthMonitor()
        return monitor.check_camera_health(camera)
    except Camera.DoesNotExist:
        return {
            'error': f'Camera with ID {camera_id} not found'
        }