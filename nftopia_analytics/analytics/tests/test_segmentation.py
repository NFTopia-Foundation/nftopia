from django.test import TestCase
from django.contrib.auth import get_user_model
from ..models import UserSegment

User = get_user_model()

class SegmentationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
    def test_segment_creation(self):
        segment = UserSegment.objects.create(
            name='Test Segment',
            segment_type='CUSTOM',
            rules={'min_transactions': 5}
        )
        self.assertEqual(str(segment), 'Test Segment (Custom)')