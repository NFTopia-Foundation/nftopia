from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

class VisualizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
    def test_minting_trend_endpoint(self):
        url = reverse('minting-trend')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.data)
        self.assertIn('layout', response.data)
        
    def test_invalid_timeframe(self):
        url = reverse('minting-trend') + '?timeframe=invalid'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)