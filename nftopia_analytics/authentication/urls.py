from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView
from .views import LoginView, LogoutView, TokenRefreshView

app_name = "authentication"

urlpatterns = [
    # Authentication endpoints
    path("login/", LoginView.as_view(), name="token_obtain"),
    path("logout/", LogoutView.as_view(), name="token_logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("verify/", TokenVerifyView.as_view(), name="token_verify"),
]
