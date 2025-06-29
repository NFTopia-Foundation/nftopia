from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from nft_trading.models import Transaction, NFTHolding
from analytics.models import UserSegment, UserSegmentMembership

User = get_user_model()


class SegmentationTestCase(TestCase):
    def setUp(self):
        # create users
        self.alice = User.objects.create_user('alice', password='pw')
        self.bob   = User.objects.create_user('bob',   password='pw')

        # alice: 50 txns; bob: 5 txns
        for _ in range(50):
            Transaction.objects.create(user=self.alice, amount=0.01)
        for _ in range(5):
            Transaction.objects.create(user=self.bob, amount=0.01)

        # bob: old holding; alice: recent holding
        NFTHolding.objects.create(user=self.bob, acquired_at='2020-01-01', collection_id=1)
        NFTHolding.objects.create(user=self.alice, acquired_at='2025-06-01', collection_id=1)

        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def test_activity_level_segment(self):
        seg = UserSegment.objects.create(
            name='Frequent',
            segment_type='activity_level',
            rules={'min_txns': 10}
        )
        # manually refresh (signals don't run in TestCase by default)
        from analytics.services import refresh_segment_memberships
        refresh_segment_memberships(seg)

        members = UserSegmentMembership.objects.filter(segment=seg).values_list('user__username', flat=True)
        self.assertIn('alice', list(members))
        self.assertNotIn('bob',   list(members))

    def test_holding_pattern_segment(self):
        seg = UserSegment.objects.create(
            name='Collectors',
            segment_type='holding_pattern',
            rules={'holding_days__gt': 365}
        )
        from analytics.services import refresh_segment_memberships
        refresh_segment_memberships(seg)

        members = UserSegmentMembership.objects.filter(segment=seg).values_list('user__username', flat=True)
        self.assertIn('bob',   list(members))
        self.assertNotIn('alice', list(members))

    def test_collection_pref_endpoint(self):
        # create a segment via API
        payload = {
            'name': 'CoolCatsFans',
            'segment_type': 'collection_pref',
            'rules': {'favorite_collection': 'CoolCats'}
        }
       
        resp = self.client.post('/analytics/api/segments/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        seg_id = resp.data['id']

        # GET users in that segment
        resp2 = self.client.get(f'/analytics/api/segments/{seg_id}/users/')
        self.assertEqual(resp2.status_code, 200)
        # resp2.data should be a list (possibly empty) with user entries
        self.assertIsInstance(resp2.data, list)
