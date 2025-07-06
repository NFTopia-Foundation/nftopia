from django.contrib import admin
from .models import MintEvent, SaleEvent, TransferEvent

@admin.register(MintEvent)
class MintEventAdmin(admin.ModelAdmin):
    list_display = ('collection', 'token_id', 'minter', 'timestamp')
    list_filter = ('collection',)
    search_fields = ('tx_hash', 'token_id')


# @admin.register(SaleEvent)
# class SaleEventAdmin(admin.ModelAdmin):
#     list_display = ('collection', 'token_id', 'minter', 'timestamp')
#     list_filter = ('collection',)
#     search_fields = ('tx_hash', 'token_id')


# @admin.register(TransferEvent)
# class TransferEventAdmin(admin.ModelAdmin):
#     list_display = ('collection', 'token_id', 'minter', 'timestamp')
#     list_filter = ('collection',)
#     search_fields = ('tx_hash', 'token_id')

# Similar for SaleEvent and TransferEvent