from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import UserSegment, UserSegmentMembership

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ("id","username","email")

class UserSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserSegment
        fields = ("id","name","segment_type","rules","last_updated")

class UserSegmentMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model  = UserSegmentMembership
        fields = ("user","joined_at")
