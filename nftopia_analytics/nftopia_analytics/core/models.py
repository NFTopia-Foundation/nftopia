# from django.db import models

# class SchemaModel(models.Model):
#     """
#     Abstract base model for schema-aware models
#     """
#     class Meta:
#         abstract = True
#         db_schema = None  # Will be overridden in child classes

#     @classmethod
#     def get_db_schema(cls):
#         return cls._meta.db_schema

#     def save(self, *args, **kwargs):
#         if not self._meta.db_schema:
#             raise ValueError(f"{self.__class__.__name__} must define db_schema")
#         super().save(*args, **kwargs)

# core/models.py
from django.db import models

class SchemaModel(models.Model):
    """
    Base model for schema-aware tables
    """
    class Meta:
        abstract = True
        # Use db_table for schema specification
        db_table = None  # Will be overridden in child classes

    @classmethod
    def get_db_schema(cls):
        """Helper method to extract schema from db_table"""
        if cls._meta.db_table and '.' in cls._meta.db_table:
            return cls._meta.db_table.split('.')[0]
        return None