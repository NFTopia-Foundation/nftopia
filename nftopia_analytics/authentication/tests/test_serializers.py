# authentication/tests/test_serializers.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import LoginSerializer, CustomTokenRefreshSerializer
from ..models import BlacklistedToken

User = get_user_model()


class LoginSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="validpass123"
        )
        self.valid_data = {"username": "testuser", "password": "validpass123"}

    def test_valid_login(self):
        """Test successful login with valid credentials"""
        serializer = LoginSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())

        validated_data = serializer.validated_data
        self.assertIn("access", validated_data)
        self.assertIn("refresh", validated_data)
        self.assertEqual(validated_data["username"], "testuser")
        self.assertEqual(validated_data["email"], "test@example.com")

    def test_missing_username(self):
        """Test login with missing username"""
        data = {"password": "validpass123"}
        serializer = LoginSerializer(data=data)

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

        self.assertIn("username", serializer.errors)

    def test_missing_password(self):
        """Test login with missing password"""
        data = {"username": "testuser"}
        serializer = LoginSerializer(data=data)

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

        self.assertIn("password", serializer.errors)

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {"username": "testuser", "password": "wrongpassword"}
        serializer = LoginSerializer(data=data)

        with self.assertRaises(AuthenticationFailed):
            serializer.is_valid(raise_exception=True)

    def test_inactive_user(self):
        """Test login with inactive user account"""
        self.user.is_active = False
        self.user.save()

        serializer = LoginSerializer(data=self.valid_data)

        with self.assertRaises(AuthenticationFailed):
            serializer.is_valid(raise_exception=True)

    def test_custom_token_claims(self):
        """Test custom claims in JWT tokens"""
        token = LoginSerializer.get_token(self.user)
        self.assertEqual(token["username"], "testuser")
        self.assertEqual(token["email"], "test@example.com")


class CustomTokenRefreshSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        self.valid_refresh = str(RefreshToken.for_user(self.user))

    def test_valid_refresh(self):
        """Test successful token refresh"""
        serializer = CustomTokenRefreshSerializer(data={"refresh": self.valid_refresh})
        self.assertTrue(serializer.is_valid())
        self.assertIn("access", serializer.validated_data)

    def test_missing_refresh_token(self):
        """Test refresh with missing token"""
        serializer = CustomTokenRefreshSerializer(data={})

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

        self.assertIn("refresh", serializer.errors)

    def test_invalid_refresh_token(self):
        """Test refresh with invalid token"""
        serializer = CustomTokenRefreshSerializer(data={"refresh": "invalidtoken"})

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_blacklisted_refresh_token(self):
        """Test refresh with blacklisted token"""
        BlacklistedToken.blacklist_token(self.valid_refresh)
        serializer = CustomTokenRefreshSerializer(data={"refresh": self.valid_refresh})

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_token_rotation(self):
        """Test refresh token rotation when enabled"""
        pass


class TokenVerifySerializerTests(TestCase):
    pass
