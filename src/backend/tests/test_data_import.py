from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from infrastructure.models import Camera, Road
from traffic_signs.models import TrafficSign
from users.models import Driver
from users.profile_services import provision_user_account
from vehicles.models import Vehicle

User = get_user_model()


class DataImportAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@import.test',
            password='CamTraffic@2026!',
            full_name='Import Admin',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        provision_user_account(self.admin)
        self.driver = User.objects.create_user(
            email='driver@import.test',
            password='CamTraffic@2026!',
            full_name='Import Driver',
            role='driver',
        )
        provision_user_account(self.driver)
        self.client.force_authenticate(self.admin)

    def test_types_requires_admin(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get('/api/imports/types/')
        self.assertEqual(res.status_code, 403)

    def test_types_ok(self):
        res = self.client.get('/api/imports/types/')
        self.assertEqual(res.status_code, 200)
        types = {item['type'] for item in res.data['data']}
        self.assertTrue({'users', 'vehicles', 'signs', 'cameras', 'violations'} <= types)

    def test_template_csv(self):
        res = self.client.get('/api/imports/template/', {'type': 'users', 'file_format': 'csv'})
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Email', res.content)

    def test_validate_and_commit_users(self):
        csv_body = (
            'Name,Email,Phone,Role,Password\n'
            'New User,newuser@import.test,012,Driver,TempPass1!\n'
            'Import Driver,driver@import.test,013,Driver,\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('users.csv', csv_body, content_type='text/csv')
        res = self.client.post('/api/imports/validate/', {'type': 'users', 'file': upload}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        data = res.data['data']
        self.assertEqual(data['counts']['valid'], 1)
        self.assertEqual(data['counts']['skipped'], 1)
        job_id = data['job_id']

        commit = self.client.post('/api/imports/commit/', {'job_id': job_id}, format='json')
        self.assertEqual(commit.status_code, 200, commit.data)
        self.assertTrue(User.objects.filter(email__iexact='newuser@import.test').exists())
        self.assertEqual(commit.data['data']['counts']['success'], 1)

    def test_validate_users_derives_name_and_role_aliases(self):
        csv_body = (
            'Email,Phone,Role\n'
            'viewer.one@import.test,011,Viewer\n'
            'editor.two@import.test,012,Editor\n'
            'manager.three@import.test,013,Manager\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('users-alias.csv', csv_body, content_type='text/csv')
        res = self.client.post('/api/imports/validate/', {'type': 'users', 'file': upload}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        rows = res.data['data']['rows']
        self.assertEqual(res.data['data']['counts']['valid'], 3)
        self.assertEqual(rows[0]['data']['name'], 'Viewer One')
        self.assertEqual(rows[0]['data']['role'], 'driver')
        self.assertEqual(rows[1]['data']['role'], 'police')
        self.assertEqual(rows[2]['data']['role'], 'admin')
        self.assertEqual(rows[2]['data']['name'], 'Manager Three')

    def test_validate_duplicate_plate_skipped(self):
        Vehicle.objects.create(
            owner=self.driver,
            driver=Driver.objects.get(user=self.driver),
            plate_number='2AB-9999',
            vehicle_type='car',
            model='Test',
            color='White',
            year=2020,
        )
        csv_body = (
            'Plate Number,Vehicle Type,Owner Email,Model,Color,Year\n'
            '2AB-9999,Car,driver@import.test,X,Y,2021\n'
            '2AB-8888,Car,driver@import.test,X,Y,2021\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('vehicles.csv', csv_body, content_type='text/csv')
        res = self.client.post('/api/imports/validate/', {'type': 'vehicles', 'file': upload}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        counts = res.data['data']['counts']
        self.assertEqual(counts['skipped'], 1)
        self.assertEqual(counts['valid'], 1)

    def test_commit_signs(self):
        csv_body = (
            'Code,Name,Category,Description\n'
            'IMP1,Import Sign,Warning,Test sign\n'
        ).encode('utf-8')
        upload = SimpleUploadedFile('signs.csv', csv_body, content_type='text/csv')
        res = self.client.post('/api/imports/validate/', {'type': 'signs', 'file': upload}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        job_id = res.data['data']['job_id']
        commit = self.client.post('/api/imports/commit/', {'job_id': job_id}, format='json')
        self.assertEqual(commit.status_code, 200, commit.data)
        self.assertTrue(TrafficSign.objects.filter(sign_code='IMP1').exists())

    def test_history_lists_jobs(self):
        csv_body = b'Code,Name,Category\nIMP2,Sign Two,Mandatory\n'
        upload = SimpleUploadedFile('signs2.csv', csv_body, content_type='text/csv')
        self.client.post('/api/imports/validate/', {'type': 'signs', 'file': upload}, format='multipart')
        res = self.client.get('/api/imports/history/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data['data']), 1)

    def test_history_detail(self):
        csv_body = b'Code,Name,Category\nIMP3,Sign Three,Warning\n'
        upload = SimpleUploadedFile('signs3.csv', csv_body, content_type='text/csv')
        validate = self.client.post('/api/imports/validate/', {'type': 'signs', 'file': upload}, format='multipart')
        job_id = validate.data['data']['job_id']
        res = self.client.get(f'/api/imports/history/{job_id}/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['data']['id'], job_id)
        self.assertIn('rows_report', res.data['data'])

    def test_commit_cameras_and_vehicles(self):
        cam_csv = (
            'Camera ID,Location,Road Name,RTSP URL,Status\n'
            'CAM-IMP-1,Test Cam,Import Road,rtsp://192.168.1.50/stream,Active\n'
        ).encode('utf-8')
        cam_upload = SimpleUploadedFile('cameras.csv', cam_csv, content_type='text/csv')
        cam_validate = self.client.post(
            '/api/imports/validate/', {'type': 'cameras', 'file': cam_upload}, format='multipart',
        )
        self.assertEqual(cam_validate.status_code, 200, cam_validate.data)
        cam_commit = self.client.post(
            '/api/imports/commit/', {'job_id': cam_validate.data['data']['job_id']}, format='json',
        )
        self.assertEqual(cam_commit.status_code, 200, cam_commit.data)
        self.assertTrue(Camera.objects.filter(code='CAM-IMP-1').exists())
        self.assertTrue(Road.objects.filter(name='Import Road').exists())
        camera = Camera.objects.get(code='CAM-IMP-1')
        self.assertTrue(camera.frame_source_url.startswith('rtsp://'))

        veh_csv = (
            'Plate Number,Vehicle Type,Owner Email,Model,Color,Year\n'
            '2ZZ-1111,Car,driver@import.test,Honda,Black,2022\n'
        ).encode('utf-8')
        veh_upload = SimpleUploadedFile('vehicles.csv', veh_csv, content_type='text/csv')
        veh_validate = self.client.post(
            '/api/imports/validate/', {'type': 'vehicles', 'file': veh_upload}, format='multipart',
        )
        self.assertEqual(veh_validate.status_code, 200, veh_validate.data)
        veh_commit = self.client.post(
            '/api/imports/commit/', {'job_id': veh_validate.data['data']['job_id']}, format='json',
        )
        self.assertEqual(veh_commit.status_code, 200, veh_commit.data)
        self.assertTrue(Vehicle.objects.filter(plate_number__iexact='2ZZ-1111').exists())

    def test_catalog_lists_imports(self):
        res = self.client.get('/api/catalog/')
        self.assertEqual(res.status_code, 200)
        modules = res.data['data']['modules']
        self.assertIn('imports', modules)
        self.assertTrue(any('imports/validate' in item for item in modules['imports']))
