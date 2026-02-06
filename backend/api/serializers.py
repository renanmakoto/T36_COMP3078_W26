from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AddOn, Appointment, Service

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "is_active", "created_at")


class AddOnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddOn
        fields = ("id", "name", "description", "price_cents", "duration_minutes")


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
    date = serializers.DateField(
        error_messages={"invalid": "date must be in YYYY-MM-DD format."}
    )
    start_time = serializers.TimeField(
        error_messages={"invalid": "start_time must be in HH:MM format."}
    )


class AppointmentUpdateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("cancel", "reschedule"))
    date = serializers.DateField(
        required=False, error_messages={"invalid": "date must be in YYYY-MM-DD format."}
    )
    start_time = serializers.TimeField(
        required=False,
        error_messages={"invalid": "start_time must be in HH:MM format."},
    )

    def validate(self, attrs):
        if attrs.get("action") == "reschedule":
            if not attrs.get("date") or not attrs.get("start_time"):
                raise serializers.ValidationError(
                    "date and start_time are required for reschedule."
                )
        return attrs


# ---------------------------------------------------------------------------
# Admin serializers
# ---------------------------------------------------------------------------


class AdminAppointmentSerializer(serializers.ModelSerializer):
    """Appointment representation for admin – includes user and service detail."""

    service = ServiceSerializer()
    user = UserSerializer()

    class Meta:
        model = Appointment
        fields = (
            "id",
            "user",
            "service",
            "start_time",
            "end_time",
            "status",
            "created_at",
        )


class AdminAppointmentUpdateSerializer(serializers.Serializer):
    """
    Admins can: cancel, reschedule, or change status of any appointment.
    """

    action = serializers.ChoiceField(choices=("cancel", "reschedule", "change_status"))
    status = serializers.ChoiceField(
        choices=("PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"),
        required=False,
    )
    date = serializers.DateField(
        required=False,
        error_messages={"invalid": "date must be in YYYY-MM-DD format."},
    )
    start_time = serializers.TimeField(
        required=False,
        error_messages={"invalid": "start_time must be in HH:MM format."},
    )

    def validate(self, attrs):
        action = attrs.get("action")
        if action == "reschedule":
            if not attrs.get("date") or not attrs.get("start_time"):
                raise serializers.ValidationError(
                    "date and start_time are required for reschedule."
                )
        elif action == "change_status":
            if not attrs.get("status"):
                raise serializers.ValidationError(
                    "status is required for change_status action."
                )
        return attrs
