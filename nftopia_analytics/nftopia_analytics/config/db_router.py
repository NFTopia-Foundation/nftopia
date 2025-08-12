# class SchemaRouter:
#     """
#     Routes queries to appropriate schemas based on model._meta.db_schema
#     """
#     def db_for_read(self, model, **hints):
#         return getattr(model._meta, 'db_schema', None)

#     def db_for_write(self, model, **hints):
#         return getattr(model._meta, 'db_schema', None)

#     def allow_relation(self, obj1, obj2, **hints):
#         # Allow relations within same schema
#         return getattr(obj1._meta, 'db_schema', None) == getattr(obj2._meta, 'db_schema', None)

#     def allow_migrate(self, db, app_label, model_name=None, **hints):
#         # Only allow migrations for models without db_schema
#         return not hasattr(hints.get('model', None), 'db_schema')


# core/db_router.py
# class SchemaRouter:
#     def db_for_read(self, model, **hints):
#         if hasattr(model._meta, 'db_table') and '.' in model._meta.db_table:
#             return model._meta.db_table.split('.')[0]
#         return None

#     def db_for_write(self, model, **hints):
#         return self.db_for_read(model, **hints)

#     def allow_relation(self, obj1, obj2, **hints):
#         # Allow relations within same schema
#         schema1 = getattr(obj1._meta, 'db_table', '').split('.')[0]
#         schema2 = getattr(obj2._meta, 'db_table', '').split('.')[0]
#         return schema1 == schema2

#     def allow_migrate(self, db, app_label, model_name=None, **hints):
#         # Only allow migrations for managed models
#         model = hints.get('model')
#         if model and not model._meta.managed:
#             return False
#         return db == 'default'



class SchemaRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'auth' or model._meta.app_label == 'contenttypes':
            return 'default'
        if hasattr(model._meta, 'db_table') and '.' in model._meta.db_table:
            return 'default'
        return None

    def db_for_write(self, model, **hints):
        return self.db_for_read(model, **hints)

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations for auth/contenttypes and within same schema"""
        # Always allow auth/contenttypes relations
        if obj1._meta.app_label in ['auth', 'contenttypes'] or \
           obj2._meta.app_label in ['auth', 'contenttypes']:
            return True
            
        # Your existing schema comparison logic
        schema1 = getattr(obj1._meta, 'db_table', '').split('.')[0]
        schema2 = getattr(obj2._meta, 'db_table', '').split('.')[0]
        return schema1 == schema2

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Allow auth/contenttypes migrations and unmanaged model migrations"""
        if app_label in ['auth', 'contenttypes']:
            return db == 'default'
        if 'model' in hints and not hints['model']._meta.managed:
            return False
        return db == 'default'