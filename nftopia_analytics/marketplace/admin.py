from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Count, Avg
from .models import Collection, GasMetrics, NFTMint, NFTSale, NFTTransfer


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'mint_count', 'sales_count', 'total_volume']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def mint_count(self, obj):
        return obj.mints.count()
    mint_count.short_description = "Total Mints"
    
    def sales_count(self, obj):
        return obj.sales.count()
    sales_count.short_description = "Total Sales"
    
    def total_volume(self, obj):
        volume = obj.sales.aggregate(total=Sum('sale_price'))['total']
        return f"{volume:.4f} ETH" if volume else "0 ETH"
    total_volume.short_description = "Total Volume"


@admin.register(NFTMint)
class NFTMintAdmin(admin.ModelAdmin):
    list_display = [
        'token_id', 'collection', 'minter_short', 'timestamp', 
        'mint_price_display', 'gas_used_display', 'block_number'
    ]
    list_filter = ['collection', 'timestamp', 'gas_price']
    search_fields = ['token_id', 'contract_address', 'minter', 'transaction_hash']
    readonly_fields = ['created_at', 'transaction_hash', 'block_number']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def minter_short(self, obj):
        return f"{obj.minter[:8]}...{obj.minter[-6:]}" if obj.minter else "N/A"
    minter_short.short_description = "Minter"
    
    def mint_price_display(self, obj):
        if obj.mint_price:
            return f"{obj.mint_price:.4f} ETH"
        return "Free"
    mint_price_display.short_description = "Price"
    
    def gas_used_display(self, obj):
        return f"{obj.gas_used:,}"
    gas_used_display.short_description = "Gas Used"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('collection')


@admin.register(NFTSale)
class NFTSaleAdmin(admin.ModelAdmin):
    list_display = [
        'token_id', 'collection', 'sale_type', 'seller_short', 'buyer_short',
        'sale_price_display', 'timestamp', 'gas_used_display'
    ]
    list_filter = ['sale_type', 'collection', 'timestamp', 'marketplace']
    search_fields = ['token_id', 'contract_address', 'seller', 'buyer', 'transaction_hash']
    readonly_fields = ['created_at', 'transaction_hash', 'block_number']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def seller_short(self, obj):
        return f"{obj.seller[:8]}...{obj.seller[-6:]}" if obj.seller else "N/A"
    seller_short.short_description = "Seller"
    
    def buyer_short(self, obj):
        return f"{obj.buyer[:8]}...{obj.buyer[-6:]}" if obj.buyer else "N/A"
    buyer_short.short_description = "Buyer"
    
    def sale_price_display(self, obj):
        color = 'green' if obj.sale_price >= 1 else 'orange' if obj.sale_price >= 0.1 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.4f} ETH</span>',
            color, obj.sale_price
        )
    sale_price_display.short_description = "Sale Price"
    
    def gas_used_display(self, obj):
        return f"{obj.gas_used:,}"
    gas_used_display.short_description = "Gas Used"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('collection')


@admin.register(NFTTransfer)
class NFTTransferAdmin(admin.ModelAdmin):
    list_display = [
        'token_id', 'collection', 'transfer_type', 'from_address_short', 
        'to_address_short', 'timestamp', 'gas_used_display'
    ]
    list_filter = ['transfer_type', 'collection', 'timestamp']
    search_fields = ['token_id', 'contract_address', 'from_address', 'to_address', 'transaction_hash']
    readonly_fields = ['created_at', 'transaction_hash', 'block_number']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def from_address_short(self, obj):
        if obj.from_address == '0x0000000000000000000000000000000000000000':
            return "MINT"
        return f"{obj.from_address[:8]}...{obj.from_address[-6:]}" if obj.from_address else "N/A"
    from_address_short.short_description = "From"
    
    def to_address_short(self, obj):
        if obj.to_address == '0x0000000000000000000000000000000000000000':
            return "BURN"
        return f"{obj.to_address[:8]}...{obj.to_address[-6:]}" if obj.to_address else "N/A"
    to_address_short.short_description = "To"
    
    def gas_used_display(self, obj):
        return f"{obj.gas_used:,}"
    gas_used_display.short_description = "Gas Used"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('collection')


@admin.register(GasMetrics)
class GasMetricsAdmin(admin.ModelAdmin):
    list_display = ['transaction_type', 'timestamp', 'gas_used_display', 'gas_price_display', 'collection']
    list_filter = ['transaction_type', 'timestamp', 'collection']
    search_fields = ['transaction_type']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def gas_used_display(self, obj):
        return f"{obj.gas_used:,}"
    gas_used_display.short_description = "Gas Used"
    
    def gas_price_display(self, obj):
        return f"{obj.gas_price:.2f} Gwei"
    gas_price_display.short_description = "Gas Price"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('collection')
