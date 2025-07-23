import os
import sys
import logging
from typing import List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class SettingsErrorHandler:
    """Handles settings-related errors with actionable messages"""
    
    @staticmethod
    def handle_validation_errors(errors: List[str], exit_on_error: bool = True) -> None:
        """Handle validation errors with clear messaging"""
        if not errors:
            return
        
        print("\n" + "="*60)
        print("🚨 DJANGO SETTINGS CONFIGURATION ERROR")
        print("="*60)
        print("\nThe following configuration issues were found:\n")
        
        for i, error in enumerate(errors, 1):
            print(f"{i}. {error}")
        
        print("\n" + "-"*60)
        print("💡 TROUBLESHOOTING STEPS:")
        print("-"*60)
        
        # Provide specific guidance based on error types
        env_errors = [e for e in errors if 'environment variable' in e.lower()]
        db_errors = [e for e in errors if 'database' in e.lower() or 'postgresql' in e.lower()]
        secret_errors = [e for e in errors if 'secret' in e.lower()]
        
        if env_errors:
            print("\n📁 Environment Variables:")
            print("   1. Create a .env file in your project root")
            print("   2. Copy .env.example to .env: cp .env.example .env")
            print("   3. Fill in the required values in .env")
            print("   4. Ensure python-dotenv is installed: pip install python-dotenv")
        
        if db_errors:
            print("\n🗄️  Database Configuration:")
            print("   1. Ensure PostgreSQL/TimescaleDB is running")
            print("   2. Verify database credentials in .env file")
            print("   3. Test connection: psql -h localhost -U postgres -d nftopia_analytics")
            print("   4. For development, set USE_SQLITE=true in .env to use SQLite")
        
        if secret_errors:
            print("\n🔐 Security Configuration:")
            print("   1. Generate a new secret key: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'")
            print("   2. Set DJANGO_SECRET_KEY in your .env file")
            print("   3. Set JWT_SECRET_KEY in your .env file")
        
        print("\n" + "="*60)
        
        if exit_on_error:
            print("\n❌ Application startup aborted due to configuration errors.")
            print("Please fix the above issues and try again.\n")
            sys.exit(1)
    
    @staticmethod
    def handle_import_error(error: ImportError, module_name: str) -> None:
        """Handle import errors with helpful messages"""
        print("\n" + "="*60)
        print(f"🚨 IMPORT ERROR: {module_name}")
        print("="*60)
        print(f"\nError: {error}")
        print("\n💡 POSSIBLE SOLUTIONS:")
        print("-"*30)
        
        if 'psycopg2' in str(error):
            print("1. Install PostgreSQL adapter: pip install psycopg2-binary")
            print("2. Or use SQLite for development: set USE_SQLITE=true in .env")
        elif 'redis' in str(error):
            print("1. Install Redis client: pip install redis django-redis")
            print("2. Ensure Redis server is running: redis-server")
        elif 'celery' in str(error):
            print("1. Install Celery: pip install celery")
            print("2. Install Django Celery extensions: pip install django-celery-beat django-celery-results")
        else:
            print(f"1. Install missing package: pip install {module_name}")
            print("2. Check requirements.txt for all dependencies")
            print("3. Ensure virtual environment is activated")
        
        print("\n" + "="*60)
        sys.exit(1)
    
    @staticmethod
    def handle_circular_import(error: Exception) -> None:
        """Handle circular import errors"""
        print("\n" + "="*60)
        print("🚨 CIRCULAR IMPORT DETECTED")
        print("="*60)
        print(f"\nError: {error}")
        print("\n💡 TROUBLESHOOTING:")
        print("-"*20)
        print("1. Check for circular dependencies in INSTALLED_APPS")
        print("2. Review import statements in settings modules")
        print("3. Use lazy imports where possible")
        print("4. Check app configurations in apps.py files")
        print("\n" + "="*60)
        sys.exit(1)
    
    @staticmethod
    def create_env_file_if_missing() -> None:
        """Create .env file from .env.example if it doesn't exist"""
        env_path = Path('.env')
        env_example_path = Path('.env.example')
        
        if not env_path.exists() and env_example_path.exists():
            print("\n📁 Creating .env file from .env.example...")
            try:
                env_path.write_text(env_example_path.read_text())
                print("✅ .env file created successfully!")
                print("⚠️  Please update the values in .env file before running again.")
            except Exception as e:
                print(f"❌ Failed to create .env file: {e}")