import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _

from .serializers import LoginSerializer, CustomTokenRefreshSerializer
from .models import BlacklistedToken

logger = logging.getLogger(__name__)


class LoginView(APIView):
    """
    Handle user authentication and JWT token generation.
    """

    serializer_class = LoginSerializer

    def post(self, request):
        """
        Authenticate user and return JWT tokens.
        """
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            logger.info(
                f"Successful login for user: {serializer.validated_data.get('username')}"
            )
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        except Exception as e:
            username = request.data.get("username", "unknown")
            logger.warning(
                f"Failed login attempt for user: {username}. Reason: {str(e)}"
            )
            return Response(
                {"error": _("Invalid credentials")}, status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    Handle user logout and token invalidation.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Blacklist refresh token and clear authentication.
        """
        try:
            refresh_token = request.data.get("refresh_token")

            if not refresh_token:
                return Response(
                    {"error": _("Refresh token is required")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Blacklist the token
            token = RefreshToken(refresh_token)
            BlacklistedToken.blacklist_token(refresh_token)
            token.blacklist()

            logger.info(f"User {request.user.username} logged out successfully")
            return Response(
                {"message": _("Logout successful")},
                status=status.HTTP_205_RESET_CONTENT,
            )

        except Exception as e:
            logger.error(
                f"Logout failed for user {request.user.username}. Error: {str(e)}"
            )
            return Response(
                {"error": _("Logout failed")}, status=status.HTTP_400_BAD_REQUEST
            )


class TokenRefreshView(APIView):
    """
    Handle JWT token refresh operations.
    """

    serializer_class = CustomTokenRefreshSerializer

    def post(self, request):
        """
        Generate new access token using valid refresh token.
        """
        serializer = self.serializer_class(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            logger.debug("Token refresh successful")
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.warning(f"Token refresh failed. Error: {str(e)}")
            return Response(
                {"error": _("Invalid or expired refresh token")},
                status=status.HTTP_401_UNAUTHORIZED,
            )
