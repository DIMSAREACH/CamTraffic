"""
API views for Push Notification Device Registration
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import PushDevice


class RegisterPushDeviceView(APIView):
    """
    Register a device for push notifications
    
    POST /api/notifications/push/register/
    Body: {
        "platform": "web",
        "device_name": "Chrome on Windows",
        "fcm_token": "...",  // For mobile
        "web_push_endpoint": "...",  // For browsers
        "web_push_p256dh": "...",
        "web_push_auth": "..."
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        platform = request.data.get('platform', 'web')
        device_name = request.data.get('device_name', '')
        
        # FCM token (mobile)
        fcm_token = request.data.get('fcm_token', '')
        
        # Web Push subscription (browsers)
        web_push_endpoint = request.data.get('web_push_endpoint', '')
        web_push_p256dh = request.data.get('web_push_p256dh', '')
        web_push_auth = request.data.get('web_push_auth', '')
        
        # Validate
        if not fcm_token and not web_push_endpoint:
            return Response(
                {'error': 'Either fcm_token or web_push_endpoint is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if device already exists
        existing = None
        if fcm_token:
            existing = PushDevice.objects.filter(
                user=request.user,
                fcm_token=fcm_token
            ).first()
        elif web_push_endpoint:
            existing = PushDevice.objects.filter(
                user=request.user,
                web_push_endpoint=web_push_endpoint
            ).first()
        
        if existing:
            # Update existing device
            existing.is_active = True
            existing.platform = platform
            existing.device_name = device_name
            if fcm_token:
                existing.fcm_token = fcm_token
            if web_push_endpoint:
                existing.web_push_endpoint = web_push_endpoint
                existing.web_push_p256dh = web_push_p256dh
                existing.web_push_auth = web_push_auth
            existing.save()
            
            return Response({
                'success': True,
                'message': 'Device updated',
                'device_id': str(existing.id),
            })
        
        # Create new device
        device = PushDevice.objects.create(
            user=request.user,
            platform=platform,
            device_name=device_name,
            fcm_token=fcm_token,
            web_push_endpoint=web_push_endpoint,
            web_push_p256dh=web_push_p256dh,
            web_push_auth=web_push_auth,
        )
        
        return Response({
            'success': True,
            'message': 'Device registered',
            'device_id': str(device.id),
        }, status=status.HTTP_201_CREATED)


class UnregisterPushDeviceView(APIView):
    """
    Unregister a device
    
    POST /api/notifications/push/unregister/
    Body: {
        "device_id": "...",  // Optional
        "fcm_token": "...",  // Or provide token
        "web_push_endpoint": "..."  // Or provide endpoint
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        device_id = request.data.get('device_id')
        fcm_token = request.data.get('fcm_token')
        web_push_endpoint = request.data.get('web_push_endpoint')
        
        # Find device
        if device_id:
            devices = PushDevice.objects.filter(
                user=request.user,
                id=device_id
            )
        elif fcm_token:
            devices = PushDevice.objects.filter(
                user=request.user,
                fcm_token=fcm_token
            )
        elif web_push_endpoint:
            devices = PushDevice.objects.filter(
                user=request.user,
                web_push_endpoint=web_push_endpoint
            )
        else:
            return Response(
                {'error': 'device_id, fcm_token, or web_push_endpoint required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count = devices.update(is_active=False)
        
        return Response({
            'success': True,
            'message': f'{count} device(s) unregistered',
        })


class ListPushDevicesView(APIView):
    """
    List all registered devices for current user
    
    GET /api/notifications/push/devices/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        devices = PushDevice.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('-last_used_at')
        
        return Response({
            'devices': [
                {
                    'id': str(d.id),
                    'platform': d.platform,
                    'device_name': d.device_name,
                    'has_fcm': bool(d.fcm_token),
                    'has_web_push': bool(d.web_push_endpoint),
                    'last_used': d.last_used_at.isoformat(),
                    'created': d.created_at.isoformat(),
                }
                for d in devices
            ],
            'total': devices.count(),
        })
