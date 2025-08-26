# from django.db import models
# from django.db.models.signals import post_save, post_delete
# from django.dispatch import receiver

# class MintingEvent(models.Model):
#     """Model to track NFT minting events"""
#     token_id = models.CharField(max_length=100)
#     contract_address = models.CharField(max_length=42)
#     minter_address = models.CharField(max_length=42)
#     token_uri = models.URLField(blank=True, null=True)
#     mint_price = models.DecimalField(max_digits=20, decimal_places=18, default=0)
#     transaction_hash = models.CharField(max_length=66, unique=True)
#     block_number = models.BigIntegerField()
#     timestamp = models.DateTimeField(auto_now_add=True)
#     gas_used = models.BigIntegerField(null=True, blank=True)
    
#     class Meta:
#         db_table = 'minting_events'
#         ordering = ['-timestamp']
    
#     def __str__(self):
#         return f"Mint {self.token_id} by {self.minter_address[:10]}..."

# # Signal handlers for cache invalidation
# @receiver(post_save, sender=MintingEvent)
# def invalidate_minting_cache_on_save(sender, instance, **kwargs):
#     """Invalidate minting cache when new minting event is saved"""
#     try:
#         from apps.cache.redis_utils import invalidate_minting_cache
#         invalidate_minting_cache()
#     except ImportError:
#         # Cache utils not available yet during initial setup
#         pass

# @receiver(post_delete, sender=MintingEvent)
# def invalidate_minting_cache_on_delete(sender, instance, **kwargs):
#     """Invalidate minting cache when minting event is deleted"""
#     try:
#         from apps.cache.redis_utils import invalidate_minting_cache
#         invalidate_minting_cache()
#     except ImportError:
#         # Cache utils not available yet during initial setup
# #         pass
# import os
# import sys
# from django.db import models


# PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
# if PROJECT_ROOT not in sys.path:
#     sys.path.append(PROJECT_ROOT)


# class NFT(SchemaModel):
#     id = models.UUIDField(primary_key=True)
#     token_id = models.CharField(max_length=255)
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta(SchemaModel.Meta):
#         db_schema = 'nftopia_user_service'
#         db_table = 'nft'
#         managed = False  # Since tables are managed by other services

# # minting/models.py

# class NftMint(SchemaModel):
#     id = models.UUIDField(primary_key=True)
#     mint_time = models.DateTimeField()
    
#     class Meta(SchemaModel.Meta):
#         db_table = 'nftopia_user_service.nft_mints'  # Schema-qualified table name
#         managed = False  # Since TimescaleDB manages these


# from django.db import models

# class NFT(models.Model):
#     id = models.UUIDField(primary_key=True)  # Matches TypeORM @PrimaryGeneratedColumn('uuid')
#     name = models.CharField(max_length=255)
#     description = models.TextField(blank=True, null=True)
#     image_url = models.CharField(max_length=500, blank=True, null=True)
#     owner_id = models.UUIDField()  # Foreign key to user table, if needed
#     collection_id = models.UUIDField(blank=True, null=True)
#     token_id = models.CharField(max_length=255)  # On-chain token ID
#     metadata_uri = models.CharField(max_length=500, blank=True, null=True)
#     created_at = models.DateTimeField()
#     updated_at = models.DateTimeField()

#     class Meta:
#         managed = False
#         db_table = 'nftopia_user_service"."nft'

# minting/models.py
from django.db import models
import uuid

class NFT(models.Model):
    id = models.UUIDField(primary_key=True)
    token_id = models.CharField(max_length=255, db_column='tokenId')  # tokenId per your entity
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    image_url = models.CharField(max_length=500, db_column='imageUrl', null=True, blank=True)
    ipfs_url = models.CharField(max_length=500, db_column='ipfsUrl', null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    price = models.DecimalField(max_digits=36, decimal_places=18, null=True)
    currency = models.CharField(max_length=16, default='STK')
    owner_id = models.UUIDField(db_column='ownerId')   # map to owner column
    collection_id = models.UUIDField(db_column='collectionId', null=True, blank=True)
    category_id = models.UUIDField(db_column='categoryId', null=True, blank=True)
    is_listed = models.BooleanField(default=False, db_column='isListed')
    created_at = models.DateTimeField(db_column='createdAt')
    updated_at = models.DateTimeField(db_column='updatedAt')

    class Meta:
        managed = False
        db_table = 'public"."nft'   # adjust schema if not public

