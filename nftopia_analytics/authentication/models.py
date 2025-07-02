from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken


class BlacklistedToken(models.Model):
    """
    Model to store blacklisted JWT tokens to prevent their reuse after logout.

    Attributes:
        token (str): The JWT token string that has been blacklisted
        user (ForeignKey): The user associated with the blacklisted token
        blacklisted_at (DateTime): When the token was blacklisted
        expires_at (DateTime): When the token naturally expires (for cleanup)
    """

    token = models.CharField(max_length=500, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blacklisted_tokens",
        help_text="The user this token belongs to",
    )
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Token expiration timestamp")

    class Meta:
        verbose_name = "Blacklisted Token"
        verbose_name_plural = "Blacklisted Tokens"
        ordering = ["-blacklisted_at"]
        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["user"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"Blacklisted token for {self.user} (expires {self.expires_at})"

    def clean(self):
        """Validate the token before saving."""
        super().clean()

        if not self.token:
            raise ValidationError("Token cannot be empty")

        if not self.expires_at:
            raise ValidationError("Expiration time must be set")

    def save(self, *args, **kwargs):
        """Ensure clean is called on save and handle token parsing."""
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def blacklist_token(cls, token_str):
        """
        Blacklist a token string.

        Args:
            token_str (str): The JWT token string to blacklist

        Returns:
            BlacklistedToken: The created blacklist record

        Raises:
            ValueError: If the token is invalid or already blacklisted
        """
        try:
            token = RefreshToken(token_str)
            user_id = token.payload.get("user_id")

            if not user_id:
                raise ValueError("Token has no associated user")

            expires_at = timezone.datetime.fromtimestamp(
                token.payload["exp"], tz=timezone.utc
            )

            return cls.objects.create(
                token=str(token), user_id=user_id, expires_at=expires_at
            )

        except Exception as e:
            raise ValueError(f"Invalid token: {str(e)}")

    @classmethod
    def cleanup_expired_tokens(cls):
        """Remove expired tokens from the database."""
        expired_count, _ = cls.objects.filter(expires_at__lt=timezone.now()).delete()
        return expired_count

    @classmethod
    def is_token_blacklisted(cls, token_str):
        """
        Check if a token is blacklisted.

        Args:
            token_str (str): The token string to check

        Returns:
            bool: True if token is blacklisted, False otherwise
        """
        return cls.objects.filter(token=token_str).exists()
