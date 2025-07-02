from rest_framework import serializers
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
    TokenVerifySerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from .models import BlacklistedToken


class LoginSerializer(TokenObtainPairSerializer):
    """
    Custom login serializer that extends default JWT token creation.
    Handles credential validation and custom token payload.
    """

    def validate(self, attrs):
        """
        Validate user credentials and create JWT tokens.
        """
        username = attrs.get("username")
        password = attrs.get("password")

        if not username or not password:
            raise serializers.ValidationError(
                _("Must include 'username' and 'password'."), code="authorization"
            )

        user = authenticate(
            request=self.context.get("request"), username=username, password=password
        )

        if not user:
            raise serializers.ValidationError(
                _("Unable to log in with provided credentials."), code="authorization"
            )

        if not user.is_active:
            raise serializers.ValidationError(
                _("User account is disabled."), code="authorization"
            )

        refresh = self.get_token(user)
        data = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        data.update(self.get_user_data(user))
        return data

    def get_user_data(self, user):
        """
        Optionally add user data to the token response.
        """
        return {"user_id": user.id, "username": user.username, "email": user.email}

    @classmethod
    def get_token(cls, user):
        """
        Add custom claims to the token payload if needed.
        """
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        return token


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom refresh token serializer with blacklist validation.
    """

    def validate(self, attrs):
        """
        Validate refresh token and return new access token.
        """
        refresh_token = attrs.get("refresh")

        if not refresh_token:
            raise InvalidToken(_("No refresh token provided"))

        if BlacklistedToken.is_token_blacklisted(refresh_token):
            raise InvalidToken(_("Refresh token is blacklisted"))

        try:
            refresh = RefreshToken(refresh_token)
            data = {"access": str(refresh.access_token)}

            if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
                data["refresh"] = str(refresh)
                refresh.blacklist()

            return data
        except Exception as e:
            raise InvalidToken(_(f"Invalid refresh token: {str(e)}"))


class CustomTokenVerifySerializer(TokenVerifySerializer):
    """
    Custom token verification serializer with additional validation.
    """

    def validate(self, attrs):
        """
        Validate token and return empty response if valid.
        """
        token = attrs.get("token")

        if not token:
            raise InvalidToken(_("No token provided"))

        try:
            return super().validate(attrs)
        except Exception as e:
            raise InvalidToken(_(f"Token verification failed: {str(e)}"))
