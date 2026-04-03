import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Func, Q, Value
from django.utils.text import slugify


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email=email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        USER = "USER", "User"
        ADMIN = "ADMIN", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.display_name or self.email


class AddOn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    price_cents = models.PositiveIntegerField()
    duration_minutes = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["is_active"]), models.Index(fields=["sort_order"])]
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class Service(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    payment_note = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField()
    sort_order = models.PositiveIntegerField(default=0)
    is_featured_home = models.BooleanField(default=False)
    home_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    available_add_ons = models.ManyToManyField(AddOn, blank=True, related_name="services")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["sort_order"]),
            models.Index(fields=["is_featured_home", "home_order"]),
        ]
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class PortfolioItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    tag = models.CharField(max_length=100, blank=True)
    is_published = models.BooleanField(default=True)
    is_featured_home = models.BooleanField(default=False)
    home_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_published"]),
            models.Index(fields=["is_featured_home", "home_order"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class BlogPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    excerpt = models.TextField(blank=True)
    body = models.TextField()
    cover_image_url = models.URLField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
    is_featured_home = models.BooleanField(default=False)
    home_order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        User,
        related_name="blog_posts",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_published"]),
            models.Index(fields=["is_featured_home", "home_order"]),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        base_slug = slugify(self.slug or self.title)[:220] or str(self.id)
        slug = base_slug
        counter = 2
        while BlogPost.objects.exclude(pk=self.pk).filter(slug=slug).exists():
            slug = f"{base_slug[:210]}-{counter}"
            counter += 1
        self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class TestimonialStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class Testimonial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        related_name="testimonials",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    service = models.ForeignKey(
        Service,
        related_name="testimonials",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    author_name = models.CharField(max_length=255)
    author_email = models.EmailField(blank=True)
    quote = models.TextField()
    rating = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    status = models.CharField(
        max_length=20,
        choices=TestimonialStatus.choices,
        default=TestimonialStatus.PENDING,
    )
    admin_notes = models.TextField(blank=True)
    is_featured_home = models.BooleanField(default=False)
    home_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["is_featured_home", "home_order"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.author_name} ({self.rating}/5)"


class AppointmentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No Show"


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, related_name="appointments", on_delete=models.CASCADE
    )
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    add_ons = models.ManyToManyField(AddOn, blank=True, related_name="appointments")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    total_price_cents = models.PositiveIntegerField(default=0)
    total_duration_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["start_time"]),
            models.Index(fields=["status"]),
        ]
        constraints = [
            ExclusionConstraint(
                name="prevent_overlapping_active_appointments",
                expressions=[
                    (
                        Func(
                            F("start_time"),
                            F("end_time"),
                            Value("[)"),
                            function="TSTZRANGE",
                        ),
                        RangeOperators.OVERLAPS,
                    )
                ],
                condition=~Q(status=AppointmentStatus.CANCELLED),
            )
        ]
        ordering = ["-start_time"]

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError({"end_time": "end_time must be after start_time."})

    def __str__(self) -> str:
        return f"{self.user.email} - {self.service.name} @ {self.start_time}"


class AppointmentNotificationEvent(models.TextChoices):
    CREATED = "BOOKING_CREATED", "Booking Created"
    RESCHEDULED = "BOOKING_RESCHEDULED", "Booking Rescheduled"
    CANCELLED = "BOOKING_CANCELLED", "Booking Cancelled"
    NO_SHOW = "BOOKING_NO_SHOW", "Booking No Show"


class AppointmentNotificationRecipient(models.TextChoices):
    CLIENT = "CLIENT", "Client"
    OWNER = "OWNER", "Owner"


class AppointmentNotificationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SENT = "SENT", "Sent"
    DELIVERED = "DELIVERED", "Delivered"
    BOUNCED = "BOUNCED", "Bounced"
    COMPLAINED = "COMPLAINED", "Complained"
    FAILED = "FAILED", "Failed"


class AppointmentEmailNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        Appointment,
        related_name="email_notifications",
        on_delete=models.CASCADE,
    )
    event_type = models.CharField(max_length=32, choices=AppointmentNotificationEvent.choices)
    recipient_type = models.CharField(
        max_length=16,
        choices=AppointmentNotificationRecipient.choices,
    )
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    provider = models.CharField(max_length=32, default="RESEND")
    provider_message_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    idempotency_key = models.CharField(max_length=255, unique=True)
    status = models.CharField(
        max_length=16,
        choices=AppointmentNotificationStatus.choices,
        default=AppointmentNotificationStatus.PENDING,
    )
    payload = models.JSONField(default=dict, blank=True)
    last_event_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    last_event_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["appointment", "event_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["recipient_email"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.event_type} -> {self.recipient_email} ({self.status})"
