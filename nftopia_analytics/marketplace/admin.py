from django.contrib import admin
from .models import Collection, GasMetrics

# Register your models here.
admin.site.register(Collection)
admin.site.register(GasMetrics)
