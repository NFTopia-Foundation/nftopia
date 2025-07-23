import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from marketplace.models import Collection, NFTMint, NFTSale
from analytics.models import UserSession, WalletConnection, RetentionCohort
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
def test_minting_analytics_range_validation():
    client = APIClient()
    url = reverse('analytics:minting_analytics')
    # Invalid range
    resp = client.get(url, {'range': 'bad'})
    assert resp.status_code == 400
    assert 'error' in resp.data
    # Out of bounds
    resp = client.get(url, {'range': '0d'})
    assert resp.status_code == 400
    resp = client.get(url, {'range': '366d'})
    assert resp.status_code == 400
    # Valid
    resp = client.get(url, {'range': '7d'})
    assert resp.status_code in (200, 206)

@pytest.mark.django_db
def test_sales_analytics_interval_and_top_collections():
    client = APIClient()
    url = reverse('analytics:sales_analytics')
    # Invalid interval
    resp = client.get(url, {'interval': 'minute'})
    assert resp.status_code == 400
    # Invalid top_collections
    resp = client.get(url, {'top_collections': 'bad'})
    assert resp.status_code == 400
    resp = client.get(url, {'top_collections': '0'})
    assert resp.status_code == 400
    resp = client.get(url, {'top_collections': '100'})
    assert resp.status_code == 400
    # Valid
    resp = client.get(url, {'interval': 'hourly', 'top_collections': '3'})
    assert resp.status_code in (200, 206)

@pytest.mark.django_db
def test_user_analytics_range_validation():
    client = APIClient()
    url = reverse('analytics:user_analytics')
    resp = client.get(url, {'range': 'bad'})
    assert resp.status_code == 400
    resp = client.get(url, {'range': '7d'})
    assert resp.status_code in (200, 206)

@pytest.mark.django_db
def test_minting_analytics_collection_id():
    client = APIClient()
    url = reverse('analytics:minting_analytics')
    resp = client.get(url, {'collection_id': 'bad'})
    assert resp.status_code == 400
    # Valid (even if no data)
    resp = client.get(url, {'collection_id': '1'})
    assert resp.status_code in (200, 206)

@pytest.mark.django_db
def test_sales_analytics_collection_id():
    client = APIClient()
    url = reverse('analytics:sales_analytics')
    resp = client.get(url, {'collection_id': 'bad'})
    assert resp.status_code == 400
    resp = client.get(url, {'collection_id': '1'})
    assert resp.status_code in (200, 206)
