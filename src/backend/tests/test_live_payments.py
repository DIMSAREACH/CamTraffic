import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from fines.models import Fine

User = get_user_model()


class LivePaymentApiTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(
            email='driver_pay@test.kh',
            password='pass12345',
            role='driver',
            first_name='Driver',
            last_name='Pay',
        )
        self.police = User.objects.create_user(
            email='police_pay@test.kh',
            password='pass12345',
            role='police',
            first_name='Police',
            last_name='Pay',
        )
        self.fine = Fine.objects.create(
            driver=self.driver,
            police=self.police,
            amount=25,
            reason='Speed',
            location='PP',
            vehicle_plate='12A-1234',
            status='pending',
        )

    def test_payment_config_manual_default(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get('/api/fines/payment-config/')
        self.assertEqual(res.status_code, 200)
        data = res.json()['data']
        self.assertIn('manual', data['modes'])

    @override_settings(
        PAYMENT_MODE='khqr',
        KHQR_MERCHANT_NAME='CamTraffic',
        KHQR_MERCHANT_ACCOUNT='001234567',
        KHQR_MERCHANT_ACCOUNT_KHR='001234568',
        KHQR_QR_IMAGE_URL='/payments/aba-khqr.png',
    )
    def test_khqr_session_issued(self):
        self.client.force_authenticate(self.driver)
        res = self.client.post(f'/api/fines/{self.fine.id}/checkout/khqr/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        body = res.json()['data']
        self.assertTrue(body['bill_reference'].startswith('CT-'))
        self.assertEqual(body['amount_usd'], '25.00')
        self.assertIn('qr_image_url', body)
        self.assertEqual(body['merchant_account_usd'], '001234567')

    @override_settings(PAYMENT_MODE='stripe', STRIPE_SECRET_KEY='sk_test_x')
    @patch('fines.stripe_gateway.create_checkout_session')
    def test_stripe_checkout_redirect_url(self, mock_session):
        mock_session.return_value = {'session_id': 'cs_test', 'checkout_url': 'https://checkout.stripe.test/cs'}
        self.client.force_authenticate(self.driver)
        res = self.client.post(f'/api/fines/{self.fine.id}/checkout/stripe/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('checkout.stripe.test', res.json()['data']['checkout_url'])
