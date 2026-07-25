"""
Management command to monitor camera health in production.
Can be run as a scheduled task or one-time health check.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import json
import time

from infrastructure.services.camera_health import run_camera_health_check


class Command(BaseCommand):
    help = 'Monitor camera health and update status'

    def add_arguments(self, parser):
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously with specified interval',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=300,  # 5 minutes
            help='Interval in seconds for continuous monitoring (default: 300)',
        )
        parser.add_argument(
            '--output-json',
            type=str,
            help='Output results to JSON file',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Reduce output verbosity',
        )

    def handle(self, *args, **options):
        """Monitor camera health based on options."""
        
        if options['continuous']:
            self.run_continuous_monitoring(options['interval'], options['quiet'])
        else:
            self.run_single_check(options)

    def run_single_check(self, options):
        """Run a single camera health check."""
        if not options['quiet']:
            self.stdout.write('🔍 Running camera health check...')
        
        results = run_camera_health_check()
        
        # Output results
        if options['output_json']:
            with open(options['output_json'], 'w') as f:
                json.dump(results, f, indent=2)
            if not options['quiet']:
                self.stdout.write(f'📄 Results saved to {options["output_json"]}')
        
        self.display_results(results, options['quiet'])

    def run_continuous_monitoring(self, interval, quiet):
        """Run continuous camera monitoring."""
        if not quiet:
            self.stdout.write(f'🔄 Starting continuous camera monitoring (interval: {interval}s)')
            self.stdout.write('Press Ctrl+C to stop')
        
        try:
            while True:
                if not quiet:
                    self.stdout.write(f'\n⏰ {time.strftime("%Y-%m-%d %H:%M:%S")} - Running health check...')
                
                results = run_camera_health_check()
                self.display_results(results, quiet, brief=True)
                
                if not quiet:
                    self.stdout.write(f'⏳ Waiting {interval} seconds until next check...')
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self.stdout.write('\n👋 Stopping camera monitoring')

    def display_results(self, results, quiet=False, brief=False):
        """Display camera health check results."""
        
        total = results['total_cameras']
        healthy = results['healthy_cameras']
        unhealthy = results['unhealthy_cameras']
        offline = results['offline_cameras']
        
        if brief:
            # Brief output for continuous monitoring
            status_emoji = '✅' if healthy == total else ('⚠️' if unhealthy > 0 else '❌')
            self.stdout.write(f'{status_emoji} {healthy}/{total} healthy, {offline} offline, {unhealthy} unhealthy')
            return
        
        # Detailed output
        self.stdout.write('\n📊 Camera Health Summary')
        self.stdout.write('=' * 30)
        self.stdout.write(f'Total Cameras: {total}')
        
        if healthy > 0:
            self.stdout.write(self.style.SUCCESS(f'✅ Healthy: {healthy}'))
        
        if offline > 0:
            self.stdout.write(self.style.WARNING(f'📴 Offline: {offline}'))
        
        if unhealthy > 0:
            self.stdout.write(self.style.ERROR(f'❌ Unhealthy: {unhealthy}'))
        
        # Overall status
        if healthy == total:
            self.stdout.write(self.style.SUCCESS('\n🎉 All cameras are healthy!'))
        elif healthy == 0:
            self.stdout.write(self.style.ERROR('\n🚨 No cameras are responding!'))
        else:
            health_percentage = (healthy / total) * 100
            self.stdout.write(f'\n📈 Camera health: {health_percentage:.1f}%')
        
        if not quiet and results['camera_details']:
            self.stdout.write('\n📷 Camera Details:')
            self.stdout.write('-' * 50)
            
            for camera in results['camera_details']:
                status_emoji = '✅' if camera['is_healthy'] else '❌'
                name = camera['name']
                location = camera['location']
                
                self.stdout.write(f'{status_emoji} {name}')
                self.stdout.write(f'   📍 {location}')
                
                if camera.get('error_message'):
                    self.stdout.write(f'   ❌ {camera["error_message"]}')
                
                if camera.get('response_time_ms'):
                    self.stdout.write(f'   ⏱️  {camera["response_time_ms"]:.1f}ms')
                
                # Show check details for unhealthy cameras
                if not camera['is_healthy'] and 'checks' in camera:
                    for check_name, check_result in camera['checks'].items():
                        status = check_result.get('status', 'unknown')
                        message = check_result.get('message', '')
                        
                        if status == 'success':
                            continue  # Skip successful checks for brevity
                        
                        check_emoji = '✅' if status == 'success' else '❌'
                        self.stdout.write(f'     {check_emoji} {check_name}: {message}')
                
                self.stdout.write('')  # Empty line between cameras