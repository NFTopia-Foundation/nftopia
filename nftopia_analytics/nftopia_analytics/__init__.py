"""
NFTopia Analytics Django Application

This module exports patched settings with robust error handling.
"""

# Import settings with error handling
try:
    from .settings import *
except Exception as e:
    import sys
    print(f"\n🚨 Failed to load Django settings: {e}")
    print("\nPlease check your configuration and try again.")
    sys.exit(1)