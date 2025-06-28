#!/usr/bin/env python3
"""
TimescaleDB Setup Script for NFTopia Analytics

This script automates the setup of TimescaleDB for NFT event analytics.
It handles database creation, extension installation, and table conversion.
"""

import os
import sys
import django
import subprocess
from pathlib import Path

# Add the project directory to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from django.conf import settings


class TimescaleDBSetup:
    """Handles TimescaleDB setup process"""
    
    def __init__(self):
        self.db_config = settings.DATABASES['default']
        self.timescale_settings = getattr(settings, 'TIMESCALEDB_SETTINGS', {})
    
    def check_prerequisites(self):
        """Check if prerequisites are met"""
        print("🔍 Checking prerequisites...")
        
        # Check if PostgreSQL is running
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                print(f"✓ PostgreSQL is running: {version}")
        except Exception as e:
            print(f"✗ PostgreSQL connection failed: {e}")
            return False
        
        # Check if TimescaleDB extension is available
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';")
                result = cursor.fetchone()
                if result:
                    print(f"✓ TimescaleDB extension is available")
                else:
                    print("✗ TimescaleDB extension not found")
                    print("📋 Please install TimescaleDB first:")
                    print("   - macOS: brew install timescaledb")
                    print("   - Ubuntu: apt-get install timescaledb-2-postgresql-14")
                    print("   - Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password timescale/timescaledb:latest-pg14")
                    return False
        except Exception as e:
            print(f"✗ Failed to check TimescaleDB availability: {e}")
            return False
        
        return True
    
    def setup_database(self):
        """Set up the database with TimescaleDB"""
        print("\n🗄️  Setting up database...")
        
        try:
            # Run migrations first
            print("Running Django migrations...")
            call_command('makemigrations', verbosity=0)
            call_command('migrate', verbosity=0)
            print("✓ Django migrations completed")
            
            # Set up TimescaleDB
            print("Setting up TimescaleDB extension and hypertables...")
            call_command('setup_timescaledb', verbosity=2)
            print("✓ TimescaleDB setup completed")
            
            # Set up retention policies and aggregates
            print("Setting up retention policies and continuous aggregates...")
            call_command('setup_retention_policies', verbosity=2)
            print("✓ Retention policies and aggregates setup completed")
            
        except Exception as e:
            print(f"✗ Database setup failed: {e}")
            return False
        
        return True
    
    def verify_setup(self):
        """Verify TimescaleDB setup"""
        print("\n🔍 Verifying setup...")
        
        try:
            with connection.cursor() as cursor:
                # Check if extension is enabled
                cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb';")
                if cursor.fetchone():
                    print("✓ TimescaleDB extension is enabled")
                else:
                    print("✗ TimescaleDB extension not enabled")
                    return False
                
                # Check hypertables
                cursor.execute("SELECT hypertable_name FROM timescaledb_information.hypertables;")
                hypertables = cursor.fetchall()
                if hypertables:
                    print(f"✓ Hypertables created: {', '.join([h[0] for h in hypertables])}")
                else:
                    print("⚠ No hypertables found")
                
                # Check continuous aggregates
                cursor.execute("SELECT view_name FROM timescaledb_information.continuous_aggregates;")
                aggregates = cursor.fetchall()
                if aggregates:
                    print(f"✓ Continuous aggregates created: {', '.join([a[0] for a in aggregates])}")
                else:
                    print("⚠ No continuous aggregates found")
                
        except Exception as e:
            print(f"✗ Verification failed: {e}")
            return False
        
        return True
    
    def print_next_steps(self):
        """Print next steps for users"""
        print("\n🎉 TimescaleDB setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Start ingesting NFT event data into the new models:")
        print("   - marketplace.NFTMint")
        print("   - marketplace.NFTSale") 
        print("   - marketplace.NFTTransfer")
        print("\n2. Monitor your analytics dashboard for real-time insights")
        print("\n3. Use the continuous aggregates for fast analytics queries:")
        print("   - nft_daily_stats")
        print("   - nft_sales_daily_stats")
        print("   - gas_metrics_hourly")
        print("   - user_activity_daily")
        print("   - page_views_hourly")
        print("\n4. Data retention policies are active:")
        print(f"   - Raw events: {self.timescale_settings.get('RETENTION_POLICIES', {}).get('raw_events', '90 days')}")
        print(f"   - Aggregates: {self.timescale_settings.get('RETENTION_POLICIES', {}).get('aggregates', '1 year')}")
        
        if self.timescale_settings.get('COMPRESSION', {}).get('enabled', False):
            compress_after = self.timescale_settings['COMPRESSION'].get('compress_after', '7 days')
            print(f"\n5. Data compression is enabled (after {compress_after})")
    
    def run(self):
        """Run the complete setup process"""
        print("🚀 Starting TimescaleDB setup for NFTopia Analytics")
        print("=" * 60)
        
        if not self.check_prerequisites():
            print("\n❌ Prerequisites not met. Please install TimescaleDB and try again.")
            return False
        
        if not self.setup_database():
            print("\n❌ Database setup failed. Please check the logs and try again.")
            return False
        
        if not self.verify_setup():
            print("\n⚠️  Setup completed with warnings. Please check the verification output.")
        
        self.print_next_steps()
        return True


def main():
    """Main entry point"""
    setup = TimescaleDBSetup()
    success = setup.run()
    
    if success:
        print("\n✅ TimescaleDB setup completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ TimescaleDB setup failed!")
        sys.exit(1)


if __name__ == '__main__':
    main() 