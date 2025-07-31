"""
Robust Django settings module with comprehensive error handling.

This module provides:
- Environment variable validation
- Database configuration validation  
- Graceful error handling with actionable messages
- Fallback mechanisms for development
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any

# Add the parent directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv not installed. Environment variables from .env file will not be loaded.")
    print("   Install with: pip install python-dotenv")

from .validators import SettingsValidator, SettingsValidationError
from .handlers import SettingsErrorHandler

# Create error handler instance
error_handler = SettingsErrorHandler()

# Create .env file if missing
error_handler.create_env_file_if_missing()

try:
    # Import the main settings
    from ..settings import *
    
    # Collect all settings for validation
    settings_dict = {key: value for key, value in globals().items() 
                    if not key.startswith('_') and key.isupper()}
    
    # Run validation
    validation_errors = SettingsValidator.validate_all(settings_dict)
    
    # Handle validation errors
    if validation_errors:
        # In development, show warnings but don't exit
        is_development = DEBUG if 'DEBUG' in settings_dict else True
        error_handler.handle_validation_errors(
            validation_errors, 
            exit_on_error=not is_development
        )
        
        if is_development:
            print("\n⚠️  Running in development mode with configuration warnings.")
            print("   Please fix these issues before deploying to production.\n")

except ImportError as e:
    error_handler.handle_import_error(e, str(e))
except Exception as e:
    if 'circular import' in str(e).lower():
        error_handler.handle_circular_import(e)
    else:
        print(f"\n🚨 Unexpected error loading settings: {e}")
        print("\nPlease check your settings configuration and try again.")
        sys.exit(1)