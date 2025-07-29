from typing import Any, Dict, List, Optional
import os
from pathlib import Path
import logging
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

class SettingsValidationError(Exception):
    """Custom exception for settings validation errors"""
    pass

class SettingsValidator:
    """Validates Django settings configuration"""
    
    REQUIRED_SETTINGS = [
        'SECRET_KEY',
        'DATABASES',
        'INSTALLED_APPS',
        'MIDDLEWARE',
    ]
    
    REQUIRED_ENV_VARS = [
        'DJANGO_SECRET_KEY',
        'TIMESCALE_DB_NAME',
        'TIMESCALE_DB_USER', 
        'TIMESCALE_DB_PASSWORD',
        'TIMESCALE_DB_HOST',
        'TIMESCALE_DB_PORT',
    ]
    
    @classmethod
    def validate_required_settings(cls, settings_dict: Dict[str, Any]) -> List[str]:
        """Validate that all required settings are present and valid"""
        errors = []
        
        for setting_name in cls.REQUIRED_SETTINGS:
            if setting_name not in settings_dict:
                errors.append(f"Missing required setting: {setting_name}")
            elif not settings_dict[setting_name]:
                errors.append(f"Required setting is empty: {setting_name}")
        
        return errors
    
    @classmethod
    def validate_environment_variables(cls) -> List[str]:
        """Validate required environment variables"""
        errors = []
        missing_vars = []
        
        for var_name in cls.REQUIRED_ENV_VARS:
            value = os.getenv(var_name)
            if not value:
                missing_vars.append(var_name)
        
        if missing_vars:
            errors.append(
                f"Missing required environment variables: {', '.join(missing_vars)}. "
                f"Please check your .env file or environment configuration."
            )
        
        return errors
    
    @classmethod
    def validate_database_config(cls, databases: Dict[str, Any]) -> List[str]:
        """Validate database configuration"""
        errors = []
        
        if 'default' not in databases:
            errors.append("Missing 'default' database configuration")
            return errors
        
        default_db = databases['default']
        required_db_keys = ['ENGINE', 'NAME']
        
        for key in required_db_keys:
            if key not in default_db or not default_db[key]:
                errors.append(f"Missing or empty database setting: {key}")
        
        # Validate PostgreSQL specific settings
        if 'postgresql' in default_db.get('ENGINE', ''):
            pg_required = ['USER', 'PASSWORD', 'HOST', 'PORT']
            for key in pg_required:
                if key not in default_db or not default_db[key]:
                    errors.append(f"Missing PostgreSQL setting: {key}")
        
        return errors
    
    @classmethod
    def validate_secret_key(cls, secret_key: str) -> List[str]:
        """Validate Django secret key"""
        errors = []
        
        if not secret_key:
            errors.append("SECRET_KEY cannot be empty")
        elif secret_key == "django-insecure-your-secret-key-here":
            errors.append("SECRET_KEY is using default insecure value. Please set DJANGO_SECRET_KEY environment variable.")
        elif len(secret_key) < 50:
            errors.append("SECRET_KEY should be at least 50 characters long")
        
        return errors
    
    @classmethod
    def validate_jwt_config(cls, jwt_config: Dict[str, Any]) -> List[str]:
        """Validate JWT configuration"""
        errors = []
        
        signing_key = jwt_config.get('SIGNING_KEY')
        if not signing_key:
            errors.append("JWT_SECRET_KEY environment variable is required for JWT authentication")
        
        return errors
    
    @classmethod
    def validate_all(cls, settings_dict: Dict[str, Any]) -> List[str]:
        """Run all validations and return list of errors"""
        all_errors = []
        
        # Validate environment variables first
        all_errors.extend(cls.validate_environment_variables())
        
        # Validate required settings
        all_errors.extend(cls.validate_required_settings(settings_dict))
        
        # Validate specific configurations
        if 'DATABASES' in settings_dict:
            all_errors.extend(cls.validate_database_config(settings_dict['DATABASES']))
        
        if 'SECRET_KEY' in settings_dict:
            all_errors.extend(cls.validate_secret_key(settings_dict['SECRET_KEY']))
        
        if 'SIMPLE_JWT' in settings_dict:
            all_errors.extend(cls.validate_jwt_config(settings_dict['SIMPLE_JWT']))
        
        return all_errors