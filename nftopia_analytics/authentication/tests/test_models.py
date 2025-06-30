# authentication/tests/test_models.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import BlacklistedToken
from django.core.exceptions import ValidationError
from django.utils import timezone

User = get_user_model()


class BlacklistedTokenModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.refresh_token = str(RefreshToken.for_user(self.user))
        self.expires_at = timezone.now() + timezone.timedelta(days=7)

    def test_token_creation(self):
        """Test successful creation of BlacklistedToken"""
        token = BlacklistedToken.objects.create(
            token=self.refresh_token, user=self.user, expires_at=self.expires_at
        )

        self.assertEqual(token.token, self.refresh_token)
        self.assertEqual(token.user, self.user)
        self.assertEqual(token.expires_at, self.expires_at)
        self.assertIsNotNone(token.blacklisted_at)

    def test_token_uniqueness(self):
        """Test token field uniqueness constraint"""
        BlacklistedToken.objects.create(
            token=self.refresh_token, user=self.user, expires_at=self.expires_at
        )

        with self.assertRaises(Exception):  # Should raise IntegrityError
            BlacklistedToken.objects.create(
                token=self.refresh_token,  # Same token
                user=self.user,
                expires_at=self.expires_at,
            )

    def test_string_representation(self):
        """Test model's string representation"""
        token = BlacklistedToken.objects.create(
            token=self.refresh_token, user=self.user, expires_at=self.expires_at
        )

        expected_str = f"Blacklisted token for {self.user} (expires {self.expires_at})"
        self.assertEqual(str(token), expected_str)

    def test_user_relationship(self):
        """Test token-user relationship"""
        token = BlacklistedToken.objects.create(
            token=self.refresh_token, user=self.user, expires_at=self.expires_at
        )

        # Test forward relation
        self.assertEqual(token.user, self.user)

        # Test reverse relation
        self.assertIn(token, self.user.blacklisted_tokens.all())

    def test_validation_rules(self):
        """Test model validation rules"""
        # Test missing token
        with self.assertRaises(ValidationError):
            token = BlacklistedToken(
                token="", user=self.user, expires_at=self.expires_at  # Empty token
            )
            token.full_clean()

        # Test missing expires_at
        with self.assertRaises(ValidationError):
            token = BlacklistedToken(
                token=self.refresh_token,
                user=self.user,
                expires_at=None,  # Missing expiration
            )
            token.full_clean()

    def test_blacklist_token_classmethod(self):
        """Test the blacklist_token class method"""
        # Test successful blacklisting
        token = BlacklistedToken.blacklist_token(self.refresh_token)
        self.assertEqual(token.token, self.refresh_token)
        self.assertEqual(token.user, self.user)

        # Test invalid token
        with self.assertRaises(ValueError):
            BlacklistedToken.blacklist_token("invalidtoken")

    def test_is_token_blacklisted(self):
        """Test token blacklist checking"""
        self.assertFalse(BlacklistedToken.is_token_blacklisted(self.refresh_token))

        BlacklistedToken.objects.create(
            token=self.refresh_token, user=self.user, expires_at=self.expires_at
        )

        self.assertTrue(BlacklistedToken.is_token_blacklisted(self.refresh_token))

    def test_cleanup_expired_tokens(self):
        """Test cleanup of expired tokens"""
        # Create expired token
        expired_token = BlacklistedToken.objects.create(
            token=self.refresh_token,
            user=self.user,
            expires_at=timezone.now() - timezone.timedelta(days=1),
        )

        # Create valid token
        valid_token = BlacklistedToken.objects.create(
            token=str(RefreshToken.for_user(self.user)),
            user=self.user,
            expires_at=timezone.now() + timezone.timedelta(days=1),
        )

        # Run cleanup
        deleted_count = BlacklistedToken.cleanup_expired_tokens()

        self.assertEqual(deleted_count, 1)
        self.assertFalse(BlacklistedToken.objects.filter(pk=expired_token.pk).exists())
        self.assertTrue(BlacklistedToken.objects.filter(pk=valid_token.pk).exists())
