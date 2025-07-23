from .models_dir import *  # Exports all models from models/ package

def ready():
    """Connect signals when app is ready"""
    from django.apps import apps
    if apps.is_installed('django.contrib.staticfiles'):
        from . import signals