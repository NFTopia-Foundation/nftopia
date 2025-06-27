"""
Setup script for NFTopia Analytics
Run this script to initialize the analytics system
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
django.setup()

from django.contrib.auth.models import User
from analytics.models import UserBehaviorMetrics, UserSession, WalletConnection
from analytics.utils import calculate_retention_cohorts
from django.utils import timezone
from datetime import timedelta
import random

def create_sample_data():
    """Create sample data for testing analytics"""
    print("Creating sample analytics data...")
    
    # Create sample users if they don't exist
    users = []
    for i in range(1, 21):  # Create 20 sample users
        username = f"user{i}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@example.com",
                'first_name': f"User",
                'last_name': f"{i}"
            }
        )
        users.append(user)
        if created:
            print(f"Created user: {username}")
    
    # Create sample sessions
    print("Creating sample sessions...")
    for user in users:
        # Create 3-10 sessions per user over the last 30 days
        num_sessions = random.randint(3, 10)
        for _ in range(num_sessions):
            login_time = timezone.now() - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            session = UserSession.objects.create(
                user=user,
                login_at=login_time,
                ip_address=f"192.168.1.{random.randint(1, 255)}",
                user_agent="Mozilla/5.0 (Test Browser)",
                geographic_region=random.choice([
                    "New York, USA", "London, UK", "Tokyo, Japan", 
                    "Sydney, Australia", "Toronto, Canada"
                ])
            )
            
            # Some sessions are completed (have logout time)
            if random.choice([True, False]):
                logout_time = login_time + timedelta(
                    minutes=random.randint(5, 120)
                )
                session.logout_at = logout_time
                session.is_active = False
                session.calculate_duration()
                session.save()
    
    # Create sample wallet connections
    print("Creating sample wallet connections...")
    wallet_providers = ['metamask', 'coinbase', 'walletconnect', 'phantom', 'trust']
    
    for user in users:
        # Create 1-5 wallet connection attempts per user
        num_connections = random.randint(1, 5)
        for _ in range(num_connections):
            connection_time = timezone.now() - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23)
            )
            
            WalletConnection.objects.create(
                user=user,
                wallet_provider=random.choice(wallet_providers),
                wallet_address=f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
                connection_status=random.choices(
                    ['success', 'failed', 'cancelled'],
                    weights=[70, 20, 10]
                )[0],
                attempted_at=connection_time,
                ip_address=f"192.168.1.{random.randint(1, 255)}",
                user_agent="Mozilla/5.0 (Test Browser)"
            )
    
    # Update user behavior metrics
    print("Updating user behavior metrics...")
    for user in users:
        metrics, created = UserBehaviorMetrics.objects.get_or_create(user=user)
        metrics.update_metrics()
    
    print("Sample data created successfully!")

def setup_analytics():
    """Setup analytics system"""
    print("Setting up NFTopia Analytics...")
    
    # Create sample data
    create_sample_data()
    
    # Calculate initial retention cohorts
    print("Calculating retention cohorts...")
    calculate_retention_cohorts('weekly')
    calculate_retention_cohorts('monthly')
    
    print("Analytics setup completed!")
    print("\nYou can now:")
    print("1. Run the Django server: python manage.py runserver")
    print("2. Visit /analytics/ to view the analytics dashboard")
    print("3. Visit /admin/ to manage analytics data")

if __name__ == "__main__":
    setup_analytics()
