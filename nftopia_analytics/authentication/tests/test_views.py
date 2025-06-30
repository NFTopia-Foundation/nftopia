# authentication/tests/test_views.py
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
import time
from ..models import BlacklistedToken

User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.login_url = reverse("authentication:token_obtain")
        self.logout_url = reverse("authentication:token_logout")
        self.refresh_url = reverse("authentication:token_refresh")
        self.verify_url = reverse("authentication:token_verify")

    # Helper methods
    def get_valid_refresh_token(self):
        return str(RefreshToken.for_user(self.user))

    def get_valid_access_token(self):
        return str(RefreshToken.for_user(self.user).access_token)

    # Login Tests
    def test_successful_login(self):
        """Test successful login returns valid tokens"""
        data = {"username": "testuser", "password": "testpass123"}
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user_id", response.data)
        self.assertEqual(response.data["username"], "testuser")

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {"username": "testuser", "password": "wrongpassword"}
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Invalid credentials")

    def test_login_missing_fields(self):
        """Test login with missing required fields"""
        # Missing password
        response = self.client.post(self.login_url, {"username": "testuser"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

        # Missing username
        response = self.client.post(self.login_url, {"password": "testpass123"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)

    def test_login_nonexistent_user(self):
        """Test login with nonexistent user"""
        data = {"username": "nonexistent", "password": "somepassword"}
        response = self.client.post(self.login_url, data)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Invalid credentials")

    # Logout Tests
    def test_successful_logout(self):
        """Test successful logout blacklists token"""
        refresh_token = self.get_valid_refresh_token()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.get_valid_access_token()}"
        )

        response = self.client.post(self.logout_url, {"refresh_token": refresh_token})

        self.assertEqual(response.status_code, 205)
        self.assertTrue(BlacklistedToken.is_token_blacklisted(refresh_token))

    def test_logout_invalid_token(self):
        """Test logout with invalid refresh token"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.get_valid_access_token()}"
        )

        response = self.client.post(self.logout_url, {"refresh_token": "invalidtoken"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Logout failed")

    def test_logout_already_blacklisted(self):
        """Test logout with already blacklisted token"""
        refresh_token = self.get_valid_refresh_token()
        BlacklistedToken.blacklist_token(refresh_token)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.get_valid_access_token()}"
        )
        response = self.client.post(self.logout_url, {"refresh_token": refresh_token})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Logout failed")

    def test_logout_without_authentication(self):
        """Test logout without being authenticated"""
        refresh_token = self.get_valid_refresh_token()
        response = self.client.post(self.logout_url, {"refresh_token": refresh_token})

        self.assertEqual(response.status_code, 401)  # Should require authentication

    # Token Refresh Tests
    def test_valid_token_refresh(self):
        """Test successful token refresh"""
        refresh_token = self.get_valid_refresh_token()
        response = self.client.post(self.refresh_url, {"refresh": refresh_token})

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_expired_token_refresh(self):
        """Test refresh with expired token"""
        response = self.client.post(self.refresh_url, {"refresh": "expiredtoken"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Invalid or expired refresh token")

    def test_blacklisted_token_refresh(self):
        """Test refresh with blacklisted token"""
        refresh_token = self.get_valid_refresh_token()
        BlacklistedToken.blacklist_token(refresh_token)

        response = self.client.post(self.refresh_url, {"refresh": refresh_token})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Invalid or expired refresh token")

    # Token Verify Tests  
    def test_valid_token_verification(self):
        """Test successful token verification"""
        access_token = self.get_valid_access_token()
        response = self.client.post(self.verify_url, {"token": access_token})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {})

    def test_expired_token_verification(self):
        """Test verification of expired token"""
        response = self.client.post(self.verify_url, {"token": "expiredtoken"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Token verification failed")

    def test_invalid_token_verification(self):
        """Test verification of invalid token"""
        response = self.client.post(self.verify_url, {"token": "completelyinvalid"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "Token verification failed")

    # Edge Cases
    def test_missing_token_field_refresh(self):
        """Test refresh with missing token field"""
        response = self.client.post(self.refresh_url, {})
        self.assertEqual(response.status_code, 400)
        self.assertIn("refresh", response.data)

    def test_missing_token_field_verify(self):
        """Test verify with missing token field"""
        response = self.client.post(self.verify_url, {})
        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

    def test_missing_refresh_field_logout(self):
        """Test logout with missing refresh_token field"""
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.get_valid_access_token()}"
        )
        response = self.client.post(self.logout_url, {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Refresh token is required")

    # Additional Security Tests
    def test_malformed_jwt_token(self):
        """Test handling of malformed JWT tokens"""
        malformed_tokens = [
            "not.a.jwt",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.malformed",
            "header.payload.signature.extra",
            "",
            None
        ]
        
        for token in malformed_tokens:
            with self.subTest(token=token):
                if token:
                    response = self.client.post(self.verify_url, {"token": token})
                    self.assertEqual(response.status_code, 401)

    def test_multiple_logout_same_token(self):
        """Test multiple logout attempts with same token"""
        refresh_token = self.get_valid_refresh_token()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.get_valid_access_token()}"
        )

        # First logout should succeed
        response1 = self.client.post(self.logout_url, {"refresh_token": refresh_token})
        self.assertEqual(response1.status_code, 205)

        # Second logout should fail
        response2 = self.client.post(self.logout_url, {"refresh_token": refresh_token})
        self.assertEqual(response2.status_code, 400)
        self.assertEqual(response2.data["error"], "Logout failed")

    def test_case_sensitivity_username(self):
        """Test username case sensitivity in login"""
        data = {"username": "TESTUSER", "password": "testpass123"}
        response = self.client.post(self.login_url, data)

        self.assertIn(response.status_code, [200, 401])

    @patch('authentication.views.logger')
    def test_logging_on_successful_login(self, mock_logger):
        """Test that successful login is logged"""
        data = {"username": "testuser", "password": "testpass123"}
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, 200)
        mock_logger.info.assert_called_once()

    @patch('authentication.views.logger')
    def test_logging_on_failed_login(self, mock_logger):
        """Test that failed login attempts are logged"""
        data = {"username": "testuser", "password": "wrongpassword"}
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, 401)
        mock_logger.warning.assert_called_once()


class TokenSecurityTests(APITestCase):
    """Additional tests for token security features"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_token_contains_expected_claims(self):
        """Test that tokens contain expected claims"""
        refresh_token = RefreshToken.for_user(self.user)
        access_token = refresh_token.access_token
        
        # Check token type
        self.assertEqual(access_token.get('token_type'), 'access')
        self.assertEqual(refresh_token.get('token_type'), 'refresh')
        
        # Check user ID is present
        self.assertEqual(access_token.get('user_id'), self.user.id)
        self.assertEqual(refresh_token.get('user_id'), self.user.id)

    def test_access_token_expiry(self):
        """Test access token has proper expiry time"""
        refresh_token = RefreshToken.for_user(self.user)
        access_token = refresh_token.access_token
        
        # Access token should have an expiry time
        self.assertIsNotNone(access_token.get('exp'))
        
        # Expiry should be in the future
        current_time = time.time()
        self.assertGreater(access_token.get('exp'), current_time)

    def test_refresh_token_expiry(self):
        """Test refresh token has proper expiry time"""
        refresh_token = RefreshToken.for_user(self.user)
        
        # Refresh token should have an expiry time
        self.assertIsNotNone(refresh_token.get('exp'))
        
        # Expiry should be in the future
        current_time = time.time()
        self.assertGreater(refresh_token.get('exp'), current_time)
        
        # Refresh token should expire later than access token
        access_token = refresh_token.access_token
        self.assertGreater(refresh_token.get('exp'), access_token.get('exp'))


class AuthenticationIntegrationTests(APITestCase):
    """Integration tests for the complete authentication flow"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.login_url = reverse("authentication:token_obtain")
        self.logout_url = reverse("authentication:token_logout")
        self.refresh_url = reverse("authentication:token_refresh")

    def test_complete_auth_flow(self):
        """Test complete authentication flow: login -> refresh -> logout"""
        # Step 1: Login
        login_data = {"username": "testuser", "password": "testpass123"}
        login_response = self.client.post(self.login_url, login_data)
        
        self.assertEqual(login_response.status_code, 200)
        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]
        
        # Step 2: Use access token to authenticate
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        
        # Step 3: Refresh the token
        refresh_data = {"refresh": refresh_token}
        refresh_response = self.client.post(self.refresh_url, refresh_data)
        
        self.assertEqual(refresh_response.status_code, 200)
        new_access_token = refresh_response.data["access"]
        self.assertNotEqual(access_token, new_access_token)
        
        # Step 4: Logout
        logout_data = {"refresh_token": refresh_token}
        logout_response = self.client.post(self.logout_url, logout_data)
        
        self.assertEqual(logout_response.status_code, 205)
        
        # Step 5: Try to use the refresh token again (should fail)
        retry_refresh = self.client.post(self.refresh_url, refresh_data)
        self.assertEqual(retry_refresh.status_code, 401)