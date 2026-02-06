from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Appointment, Service

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "is_active", "is_staff", "created_at")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already registered.")
        return email

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role=User.Role.USER,
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name", "description", "duration_minutes", "price_cents")


class AppointmentSerializer(serializers.ModelSerializer):
    service = ServiceSerializer()

    class Meta:
        model = Appointment
        fields = ("id", "service", "start_time", "end_time", "status", "created_at")


class AppointmentCreateSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    date = serializers.DateField()
    start_time = serializers.TimeField()


class AppointmentUpdateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("cancel", "reschedule"))
    date = serializers.DateField(required=False)
    start_time = serializers.TimeField(required=False)

    def validate(self, attrs):
        if attrs.get("action") == "reschedule":
            if not attrs.get("date") or not attrs.get("start_time"):
                raise serializers.ValidationError(
                    "date and start_time are required for reschedule."
                )
        return attrs
