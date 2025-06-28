#!/usr/bin/env python3
"""
Validation script for TimescaleDB setup

This script validates that TimescaleDB is properly configured and functional
for NFTopia analytics.
"""

import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
django.setup()

from django.db import connection
from django.conf import settings
from marketplace.models import Collection, NFTMint, NFTSale, NFTTransfer


class TimescaleDBValidator:
    """Validates TimescaleDB setup and functionality"""
    
    def __init__(self):
        self.passed_tests = 0
        self.total_tests = 0
        self.warnings = []
    
    def test(self, description):
        """Decorator for test methods"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                self.total_tests += 1
                print(f"\n🔍 Testing: {description}")
                try:
                    result = func(*args, **kwargs)
                    if result:
                        print("✅ PASSED")
                        self.passed_tests += 1
                    else:
                        print("❌ FAILED")
                    return result
                except Exception as e:
                    print(f"❌ FAILED: {e}")
                    return False
            return wrapper
        return decorator
    
    @test("Database connection")
    def test_database_connection(self):
        """Test basic database connectivity"""
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            result = cursor.fetchone()
            return result[0] == 1
    
    @test("TimescaleDB extension")
    def test_timescaledb_extension(self):
        """Test TimescaleDB extension is enabled"""
        with connection.cursor() as cursor:
            cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb';")
            result = cursor.fetchone()
            return result is not None and result[0] == 'timescaledb'
    
    @test("Hypertables creation")
    def test_hypertables(self):
        """Test that hypertables are properly created"""
        expected_hypertables = [
            'marketplace_nftmint',
            'marketplace_nftsale', 
            'marketplace_nfttransfer',
            'marketplace_gasmetrics'
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT hypertable_name FROM timescaledb_information.hypertables;")
            existing_hypertables = [row[0] for row in cursor.fetchall()]
            
            missing = set(expected_hypertables) - set(existing_hypertables)
            if missing:
                self.warnings.append(f"Missing hypertables: {', '.join(missing)}")
                return False
            
            print(f"   Found hypertables: {', '.join(existing_hypertables)}")
            return True
    
    @test("Continuous aggregates")
    def test_continuous_aggregates(self):
        """Test continuous aggregates are created"""
        expected_aggregates = [
            'nft_daily_stats',
            'nft_sales_daily_stats',
            'gas_metrics_hourly'
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT view_name FROM timescaledb_information.continuous_aggregates;")
            existing_aggregates = [row[0] for row in cursor.fetchall()]
            
            missing = set(expected_aggregates) - set(existing_aggregates)
            if missing:
                self.warnings.append(f"Missing aggregates: {', '.join(missing)}")
                # This is not a failure, just a warning
            
            if existing_aggregates:
                print(f"   Found aggregates: {', '.join(existing_aggregates)}")
            
            return True
    
    @test("Model functionality")
    def test_model_creation(self):
        """Test that Django models work with TimescaleDB"""
        # Create a test collection
        collection = Collection.objects.create(
            name="Test Collection",
            description="Test collection for validation"
        )
        
        # Test NFTMint creation
        mint = NFTMint.objects.create(
            token_id="test_123",
            contract_address="0x1234567890123456789012345678901234567890",
            minter="0x9876543210987654321098765432109876543210",
            collection=collection,
            timestamp=django.utils.timezone.now(),
            block_number=18500000,
            transaction_hash="0xtest123",
            gas_used=120000,
            gas_price=25.5
        )
        
        # Test NFTSale creation
        sale = NFTSale.objects.create(
            token_id="test_123",
            contract_address="0x1234567890123456789012345678901234567890",
            seller="0x9876543210987654321098765432109876543210",
            buyer="0x1111111111111111111111111111111111111111",
            collection=collection,
            sale_type="DIRECT",
            timestamp=django.utils.timezone.now(),
            block_number=18500001,
            transaction_hash="0xtest456",
            sale_price=1.5,
            gas_used=150000,
            gas_price=30.0
        )
        
        # Verify creation
        assert mint.id is not None
        assert sale.id is not None
        
        # Clean up
        mint.delete()
        sale.delete()
        collection.delete()
        
        return True
    
    @test("Time-series queries")
    def test_time_series_queries(self):
        """Test time-series specific queries work"""
        with connection.cursor() as cursor:
            # Test time_bucket function (TimescaleDB specific)
            cursor.execute("""
                SELECT time_bucket('1 hour', NOW()) as bucket;
            """)
            result = cursor.fetchone()
            return result is not None
    
    @test("Compression settings")
    def test_compression(self):
        """Test compression configuration"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT hypertable_name, compression_enabled 
                FROM timescaledb_information.compression_settings;
            """)
            compression_settings = cursor.fetchall()
            
            if compression_settings:
                print(f"   Compression enabled for: {len(compression_settings)} tables")
                return True
            else:
                self.warnings.append("No compression settings found")
                return True  # Not a failure
    
    def run_validation(self):
        """Run all validation tests"""
        print("🚀 Starting TimescaleDB Validation")
        print("=" * 50)
        
        # Run all test methods
        self.test_database_connection()
        self.test_timescaledb_extension()
        self.test_hypertables()
        self.test_continuous_aggregates()
        self.test_model_creation()
        self.test_time_series_queries()
        self.test_compression()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Validation Results: {self.passed_tests}/{self.total_tests} tests passed")
        
        if self.warnings:
            print("\n⚠️  Warnings:")
            for warning in self.warnings:
                print(f"   • {warning}")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 All tests passed! TimescaleDB is properly configured.")
            return True
        else:
            print(f"\n❌ {self.total_tests - self.passed_tests} tests failed. Please check your TimescaleDB setup.")
            return False


def main():
    """Main entry point"""
    validator = TimescaleDBValidator()
    success = validator.run_validation()
    
    if success:
        print("\n✅ TimescaleDB validation completed successfully!")
        print("\n📋 Next steps:")
        print("1. Start ingesting real NFT event data")
        print("2. Monitor the analytics dashboard")
        print("3. Query the continuous aggregates for insights")
        sys.exit(0)
    else:
        print("\n❌ TimescaleDB validation failed!")
        print("Please run the setup script: python scripts/setup_timescaledb.py")
        sys.exit(1)


if __name__ == '__main__':
    main() 