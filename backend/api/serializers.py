from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    AddOn,
    Appointment,
    BlogPost,
    PortfolioItem,
    Service,
    Testimonial,
    TestimonialStatus,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "display_name", "phone", "role", "is_active", "created_at")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    phone = serializers.CharField(max_length=32)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        existing = User.objects.filter(email__iexact=email).first()
        if existing and existing.role == User.Role.ADMIN:
            raise serializers.ValidationError("Admin accounts can only be created manually.")
        if existing and existing.has_usable_password():
            raise serializers.ValidationError("Email already registered.")
        return email

    def validate_phone(self, value: str) -> str:
        phone = value.strip()
        if not phone:
            raise serializers.ValidationError("Phone is required.")
        return phone

    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        display_name = validated_data.get("display_name", "").strip()
        phone = validated_data["phone"]

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            existing.display_name = display_name or existing.display_name
            existing.phone = phone
            existing.role = User.Role.USER
            existing.set_password(password)
            existing.save(update_fields=["display_name", "phone", "role", "password"])
            return existing

        return User.objects.create_user(
            email=email,
            password=password,
            display_name=display_name,
            phone=phone,
            role=User.Role.USER,
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ServiceSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name", "duration_minutes", "price_cents", "image_url")


class AddOnSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddOn
        fields = (
            "id",
            "name",
            "description",
            "category",
            "price_cents",
            "duration_minutes",
            "sort_order",
        )


class AddOnAdminSerializer(serializers.ModelSerializer):
    service_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )
    services = ServiceSummarySerializer(many=True, read_only=True)

    class Meta:
        model = AddOn
        fields = (
            "id",
            "name",
            "description",
            "category",
            "price_cents",
            "duration_minutes",
            "sort_order",
            "is_active",
            "service_ids",
            "services",
            "created_at",
        )

    def _set_services(self, addon: AddOn, service_ids: list[str] | None):
        if service_ids is None:
            return
        services = Service.objects.filter(id__in=service_ids)
        if services.count() != len(service_ids):
            raise serializers.ValidationError({"service_ids": "One or more services were not found."})
        addon.services.set(services)

    def create(self, validated_data):
        service_ids = validated_data.pop("service_ids", None)
        addon = super().create(validated_data)
        self._set_services(addon, service_ids)
        return addon

    def update(self, instance, validated_data):
        service_ids = validated_data.pop("service_ids", None)
        addon = super().update(instance, validated_data)
        self._set_services(addon, service_ids)
        return addon


class ServiceSerializer(serializers.ModelSerializer):
    available_add_ons = AddOnSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "description",
            "image_url",
            "payment_note",
            "duration_minutes",
            "price_cents",
            "sort_order",
            "available_add_ons",
        )


class ServiceAdminSerializer(serializers.ModelSerializer):
    add_on_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )
    available_add_ons = AddOnSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "description",
            "image_url",
            "payment_note",
            "duration_minutes",
            "price_cents",
            "sort_order",
            "is_featured_home",
            "home_order",
            "is_active",
            "add_on_ids",
            "available_add_ons",
            "created_at",
        )

    def _set_add_ons(self, service: Service, add_on_ids: list[str] | None):
        if add_on_ids is None:
            return
        add_ons = AddOn.objects.filter(id__in=add_on_ids)
        if add_ons.count() != len(add_on_ids):
            raise serializers.ValidationError({"add_on_ids": "One or more add-ons were not found."})
        service.available_add_ons.set(add_ons)

    def create(self, validated_data):
        add_on_ids = validated_data.pop("add_on_ids", None)
        service = super().create(validated_data)
        self._set_add_ons(service, add_on_ids)
        return service

    def update(self, instance, validated_data):
        add_on_ids = validated_data.pop("add_on_ids", None)
        service = super().update(instance, validated_data)
        self._set_add_ons(service, add_on_ids)
        return service


class AppointmentSerializer(serializers.ModelSerializer):
    service = ServiceSummarySerializer(read_only=True)
    add_ons = AddOnSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "service",
            "add_ons",
            "start_time",
            "end_time",
            "total_price_cents",
            "total_duration_minutes",
            "notes",
            "status",
            "created_at",
            "updated_at",
        )


class AppointmentCreateSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    add_on_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    date = serializers.DateField(
        error_messages={"invalid": "date must be in YYYY-MM-DD format."}
    )
    start_time = serializers.TimeField(
        error_messages={"invalid": "start_time must be in HH:MM format."}
    )
    notes = serializers.CharField(required=False, allow_blank=True)


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


class AdminAppointmentSerializer(serializers.ModelSerializer):
    service = ServiceSummarySerializer(read_only=True)
    add_ons = AddOnSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "user",
            "service",
            "add_ons",
            "start_time",
            "end_time",
            "total_price_cents",
            "total_duration_minutes",
            "notes",
            "status",
            "created_at",
            "updated_at",
        )


class AdminAppointmentCreateSerializer(serializers.Serializer):
    customer_email = serializers.EmailField()
    customer_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    service_id = serializers.UUIDField()
    add_on_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    date = serializers.DateField(
        error_messages={"invalid": "date must be in YYYY-MM-DD format."}
    )
    start_time = serializers.TimeField(
        error_messages={"invalid": "start_time must be in HH:MM format."}
    )
    status = serializers.ChoiceField(
        choices=("PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"),
        required=False,
        default="CONFIRMED",
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class AdminAppointmentUpdateSerializer(serializers.Serializer):
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
        elif action == "change_status" and not attrs.get("status"):
            raise serializers.ValidationError(
                "status is required for change_status action."
            )
        return attrs


class AdminAppointmentMutationSerializer(serializers.Serializer):
    customer_email = serializers.EmailField(required=False)
    customer_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    service_id = serializers.UUIDField(required=False)
    add_on_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    date = serializers.DateField(
        required=False,
        error_messages={"invalid": "date must be in YYYY-MM-DD format."},
    )
    start_time = serializers.TimeField(
        required=False,
        error_messages={"invalid": "start_time must be in HH:MM format."},
    )
    status = serializers.ChoiceField(
        choices=("PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"),
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = (
            "id",
            "title",
            "subtitle",
            "description",
            "image_url",
            "tag",
            "created_at",
            "updated_at",
        )


class PortfolioItemAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = (
            "id",
            "title",
            "subtitle",
            "description",
            "image_url",
            "tag",
            "is_published",
            "is_featured_home",
            "home_order",
            "created_at",
            "updated_at",
        )


class BlogPostListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "cover_image_url",
            "tags",
            "created_at",
            "updated_at",
        )


class BlogPostDetailSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "body",
            "cover_image_url",
            "tags",
            "created_by",
            "created_at",
            "updated_at",
        )


class BlogPostAdminSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "body",
            "cover_image_url",
            "tags",
            "is_published",
            "is_featured_home",
            "home_order",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by",)

    def validate_tags(self, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item.strip()]


class TestimonialSerializer(serializers.ModelSerializer):
    service = ServiceSummarySerializer(read_only=True)

    class Meta:
        model = Testimonial
        fields = (
            "id",
            "author_name",
            "quote",
            "rating",
            "service",
            "created_at",
        )


class TestimonialCreateSerializer(serializers.Serializer):
    author_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    quote = serializers.CharField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    service_id = serializers.UUIDField(required=False)


class TestimonialAdminSerializer(serializers.ModelSerializer):
    service = ServiceSummarySerializer(read_only=True)
    service_id = serializers.UUIDField(required=False, write_only=True, allow_null=True)

    class Meta:
        model = Testimonial
        fields = (
            "id",
            "author_name",
            "author_email",
            "quote",
            "rating",
            "status",
            "admin_notes",
            "service",
            "service_id",
            "is_featured_home",
            "home_order",
            "created_at",
            "updated_at",
        )

    def validate_status(self, value: str) -> str:
        if value not in TestimonialStatus.values:
            raise serializers.ValidationError("Invalid testimonial status.")
        return value

    def _set_service(self, testimonial: Testimonial, service_id):
        if service_id is None:
            return
        if not service_id:
            testimonial.service = None
            testimonial.save(update_fields=["service"])
            return
        service = Service.objects.filter(id=service_id).first()
        if not service:
            raise serializers.ValidationError({"service_id": "Service not found."})
        testimonial.service = service
        testimonial.save(update_fields=["service"])

    def create(self, validated_data):
        service_id = validated_data.pop("service_id", None)
        testimonial = super().create(validated_data)
        self._set_service(testimonial, service_id)
        return testimonial

    def update(self, instance, validated_data):
        service_id = validated_data.pop("service_id", None)
        testimonial = super().update(instance, validated_data)
        self._set_service(testimonial, service_id)
        return testimonial
