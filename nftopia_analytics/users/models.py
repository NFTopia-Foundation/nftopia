from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet_address = models.CharField(
        _('wallet address'),
        max_length=42,
        unique=True,
        help_text=_('Starknet wallet address')
    )
    avatar = models.URLField(
        _('avatar'),
        blank=True,
        null=True,
        help_text=_('URL to user avatar image')
    )
    is_artist = models.BooleanField(
        _('artist status'),
        default=False,
        help_text=_('Designates whether the user is an artist')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Remove username field (we'll use wallet_address as username)
    username = None
    USERNAME_FIELD = 'wallet_address'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        return self.wallet_address or str(self.id)
    
class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    bio = models.TextField(_('bio'), blank=True)
    website = models.URLField(_('website'), blank=True)
    social_links = models.JSONField(_('social links'), default=dict)

    class Meta:
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')

    def __str__(self):
        return f"Profile of {self.user.wallet_address}"