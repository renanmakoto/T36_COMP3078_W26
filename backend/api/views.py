from datetime import datetime, time, timedelta

from django.db import IntegrityError
from django.db.models import Count, F
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    AddOn,
    Appointment,
    AppointmentStatus,
    BlogPost,
    PortfolioItem,
    Service,
    Testimonial,
    TestimonialStatus,
    User,
)
from .permissions import IsAdmin
from .serializers import (
    AddOnAdminSerializer,
    AdminAppointmentCreateSerializer,
    AdminAppointmentMutationSerializer,
    AdminAppointmentSerializer,
    AdminAppointmentUpdateSerializer,
    AppointmentCreateSerializer,
    AppointmentSerializer,
    AppointmentUpdateSerializer,
    BlogPostAdminSerializer,
    BlogPostDetailSerializer,
    BlogPostListSerializer,
    CustomTokenObtainPairSerializer,
    PortfolioItemAdminSerializer,
    PortfolioItemSerializer,
    RegisterSerializer,
    ServiceAdminSerializer,
    ServiceSerializer,
    TestimonialAdminSerializer,
    TestimonialCreateSerializer,
    TestimonialSerializer,
    UserSerializer,
)

BUSINESS_START = time(10, 0)
BUSINESS_END = time(19, 0)
SLOT_MINUTES = 15


def _parse_date_param(value: str | None):
    if not value:
        raise ValidationError({"date": "date query parameter is required (YYYY-MM-DD)."})
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValidationError({"date": "date must be in YYYY-MM-DD format."}) from exc


def _is_aligned_to_grid(value: time, minutes: int = SLOT_MINUTES) -> bool:
    return value.minute % minutes == 0 and value.second == 0 and value.microsecond == 0


def _ensure_aligned(value: time):
    if not _is_aligned_to_grid(value):
        raise ValidationError({"start_time": "start_time must align to a 15-minute grid."})


def _ensure_within_business_hours(start_dt: datetime, end_dt: datetime):
    day_start = datetime.combine(start_dt.date(), BUSINESS_START, tzinfo=start_dt.tzinfo)
    day_end = datetime.combine(start_dt.date(), BUSINESS_END, tzinfo=start_dt.tzinfo)
    if start_dt < day_start or end_dt > day_end:
        raise ValidationError(
            {"start_time": "start_time must be within business hours (10:00-19:00)."}
        )


def _normalize_uuid_list(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return list(dict.fromkeys(str(value) for value in values))


def _get_active_service(service_id):
    service = Service.objects.filter(id=service_id, is_active=True).first()
    if not service:
        raise ValidationError({"service_id": "Service not found or inactive."})
    return service


def _get_service_for_admin(service_id):
    service = Service.objects.filter(id=service_id).first()
    if not service:
        raise ValidationError({"service_id": "Service not found."})
    return service


def _get_service_add_ons(add_on_ids: list[str] | None, service: Service) -> list[AddOn]:
    ids = _normalize_uuid_list(add_on_ids)
    if not ids:
        return []
    add_ons = list(
        service.available_add_ons.filter(is_active=True, id__in=ids).order_by("sort_order", "name")
    )
    if len(add_ons) != len(ids):
        raise ValidationError({"add_on_ids": "One or more add-ons are not available for this service."})
    return add_ons


def _calculate_totals(service: Service, add_ons: list[AddOn]) -> tuple[int, int]:
    total_price = service.price_cents + sum(add_on.price_cents for add_on in add_ons)
    total_duration = service.duration_minutes + sum(add_on.duration_minutes for add_on in add_ons)
    return total_price, total_duration


def _ensure_no_conflict(start_dt: datetime, end_dt: datetime, exclude_id=None):
    qs = Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    conflict = qs.filter(start_time__lt=end_dt, end_time__gt=start_dt).exists()
    if conflict:
        raise ValidationError({"detail": "Requested time overlaps an existing appointment."})


def _get_or_create_booking_user(email: str, display_name: str = "") -> User:
    email = email.strip().lower()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        updated_fields: list[str] = []
        if display_name.strip() and not user.display_name:
            user.display_name = display_name.strip()
            updated_fields.append("display_name")
        if user.role != User.Role.USER:
            user.role = User.Role.USER
            updated_fields.append("role")
        if updated_fields:
            user.save(update_fields=updated_fields)
        return user

    return User.objects.create_user(
        email=email,
        password=None,
        display_name=display_name.strip(),
        role=User.Role.USER,
    )


def _apply_appointment(
    appointment: Appointment,
    *,
    user: User,
    service: Service,
    add_ons: list[AddOn],
    start_dt: datetime,
    status_value: str,
    notes: str,
):
    total_price, total_duration = _calculate_totals(service, add_ons)
    end_dt = start_dt + timedelta(minutes=total_duration)

    appointment.user = user
    appointment.service = service
    appointment.start_time = start_dt
    appointment.end_time = end_dt
    appointment.total_price_cents = total_price
    appointment.total_duration_minutes = total_duration
    appointment.notes = notes
    appointment.status = status_value
    appointment.save()
    appointment.add_ons.set(add_ons)
    return appointment


def _appointment_queryset():
    return Appointment.objects.select_related("service", "user").prefetch_related("add_ons")


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError:
            raise ValidationError({"email": "Email already registered."})
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class HomeContentView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        featured_services = list(
            Service.objects.filter(is_active=True, is_featured_home=True)
            .prefetch_related("available_add_ons")
            .order_by("home_order", "sort_order", "name")[:3]
        )
        if not featured_services:
            featured_services = list(
                Service.objects.filter(is_active=True)
                .prefetch_related("available_add_ons")
                .order_by("sort_order", "name")[:3]
            )

        featured_portfolio = list(
            PortfolioItem.objects.filter(is_published=True, is_featured_home=True)
            .order_by("home_order", "-created_at")[:3]
        )
        if not featured_portfolio:
            featured_portfolio = list(
                PortfolioItem.objects.filter(is_published=True).order_by("-created_at")[:3]
            )

        featured_blog_posts = list(
            BlogPost.objects.filter(is_published=True, is_featured_home=True)
            .select_related("created_by")
            .order_by("home_order", "-created_at")[:3]
        )
        if not featured_blog_posts:
            featured_blog_posts = list(
                BlogPost.objects.filter(is_published=True)
                .select_related("created_by")
                .order_by("-created_at")[:3]
            )

        featured_testimonials = list(
            Testimonial.objects.filter(
                status=TestimonialStatus.APPROVED,
                is_featured_home=True,
            )
            .select_related("service")
            .order_by("home_order", "-created_at")[:3]
        )
        if not featured_testimonials:
            featured_testimonials = list(
                Testimonial.objects.filter(status=TestimonialStatus.APPROVED)
                .select_related("service")
                .order_by("-created_at")[:3]
            )

        return Response(
            {
                "featured_services": ServiceSerializer(featured_services, many=True).data,
                "featured_portfolio": PortfolioItemSerializer(featured_portfolio, many=True).data,
                "featured_blog_posts": BlogPostListSerializer(featured_blog_posts, many=True).data,
                "featured_testimonials": TestimonialSerializer(featured_testimonials, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class ServiceListView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(is_active=True).prefetch_related("available_add_ons")


class PortfolioItemListView(generics.ListAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return PortfolioItem.objects.filter(is_published=True).order_by("-created_at")


class BlogPostListView(generics.ListAPIView):
    serializer_class = BlogPostListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True).select_related("created_by")


class BlogPostDetailView(generics.RetrieveAPIView):
    serializer_class = BlogPostDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True).select_related("created_by")


class TestimonialListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        testimonials = (
            Testimonial.objects.filter(status=TestimonialStatus.APPROVED)
            .select_related("service")
            .order_by("-created_at")
        )
        return Response(
            TestimonialSerializer(testimonials, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = TestimonialCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = None
        service_id = serializer.validated_data.get("service_id")
        if service_id:
            service = Service.objects.filter(id=service_id, is_active=True).first()
            if not service:
                raise ValidationError({"service_id": "Service not found or inactive."})

        author_name = serializer.validated_data.get("author_name", "").strip()
        if not author_name:
            author_name = request.user.display_name or request.user.email.split("@")[0]

        testimonial = Testimonial.objects.create(
            user=request.user,
            service=service,
            author_name=author_name,
            author_email=request.user.email,
            quote=serializer.validated_data["quote"],
            rating=serializer.validated_data["rating"],
            status=TestimonialStatus.PENDING,
        )
        return Response(
            TestimonialSerializer(testimonial).data,
            status=status.HTTP_201_CREATED,
        )


class AvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        target_date = _parse_date_param(request.query_params.get("date"))

        duration_param = request.query_params.get("duration")
        service_duration = int(duration_param) if duration_param else SLOT_MINUTES

        tz = timezone.get_current_timezone()
        day_start = datetime.combine(target_date, BUSINESS_START)
        day_end = datetime.combine(target_date, BUSINESS_END)

        slots = []
        current = day_start
        while current + timedelta(minutes=service_duration) <= day_end:
            slots.append(current)
            current += timedelta(minutes=SLOT_MINUTES)

        slot_windows = [
            (
                timezone.make_aware(slot, tz),
                timezone.make_aware(slot + timedelta(minutes=service_duration), tz),
            )
            for slot in slots
        ]

        appointments = Appointment.objects.exclude(
            status=AppointmentStatus.CANCELLED
        ).filter(
            start_time__lt=timezone.make_aware(day_end, tz),
            end_time__gt=timezone.make_aware(day_start, tz),
        )

        available_slots = []
        for slot_start, slot_end in slot_windows:
            conflict = appointments.filter(
                start_time__lt=slot_end, end_time__gt=slot_start
            ).exists()
            if not conflict:
                available_slots.append(slot_start.strftime("%H:%M"))

        return Response(
            {"date": target_date.isoformat(), "slots": available_slots},
            status=status.HTTP_200_OK,
        )


class AppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.query_params.get("me") != "true":
            raise ValidationError({"me": "Query parameter me=true is required."})
        appointments = _appointment_queryset().filter(user=request.user)
        return Response(
            AppointmentSerializer(appointments, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AppointmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = _get_active_service(serializer.validated_data["service_id"])
        add_ons = _get_service_add_ons(
            serializer.validated_data.get("add_on_ids"),
            service,
        )
        total_price, total_duration = _calculate_totals(service, add_ons)

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=total_duration)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt)

        appointment = Appointment.objects.create(
            user=request.user,
            service=service,
            start_time=start_dt,
            end_time=end_dt,
            total_price_cents=total_price,
            total_duration_minutes=total_duration,
            notes=serializer.validated_data.get("notes", ""),
            status=AppointmentStatus.CONFIRMED,
        )
        appointment.add_ons.set(add_ons)
        return Response(
            AppointmentSerializer(appointment).data,
            status=status.HTTP_201_CREATED,
        )


class AppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_id):
        serializer = AppointmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = _appointment_queryset().filter(
            id=appointment_id, user=request.user
        ).first()
        if not appointment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        action = serializer.validated_data["action"]
        if action == "cancel":
            appointment.status = AppointmentStatus.CANCELLED
            appointment.save(update_fields=["status", "updated_at"])
            return Response(
                AppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=appointment.total_duration_minutes or appointment.service.duration_minutes)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt, exclude_id=appointment.id)

        appointment.start_time = start_dt
        appointment.end_time = end_dt
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["start_time", "end_time", "status", "updated_at"])

        return Response(
            AppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )


class AdminServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Service.objects.prefetch_related("available_add_ons")


class AdminServiceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Service.objects.prefetch_related("available_add_ons")


class AdminAddOnListCreateView(generics.ListCreateAPIView):
    serializer_class = AddOnAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return AddOn.objects.prefetch_related("services")


class AdminAddOnDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AddOnAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = AddOn.objects.prefetch_related("services")


class AdminPortfolioItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PortfolioItemAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = PortfolioItem.objects.all()


class AdminPortfolioItemDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PortfolioItemAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = PortfolioItem.objects.all()


class AdminBlogPostListCreateView(generics.ListCreateAPIView):
    serializer_class = BlogPostAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return BlogPost.objects.select_related("created_by")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminBlogPostDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = BlogPostAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = BlogPost.objects.select_related("created_by")


class AdminTestimonialListCreateView(generics.ListCreateAPIView):
    serializer_class = TestimonialAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Testimonial.objects.select_related("service", "user")


class AdminTestimonialDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TestimonialAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Testimonial.objects.select_related("service", "user")


class AdminAppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = _appointment_queryset()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        date_filter = request.query_params.get("date")
        if date_filter:
            try:
                target = datetime.strptime(date_filter, "%Y-%m-%d").date()
            except ValueError:
                raise ValidationError({"date": "date must be in YYYY-MM-DD format."})
            tz = timezone.get_current_timezone()
            day_start = timezone.make_aware(datetime.combine(target, time.min), tz)
            day_end = timezone.make_aware(datetime.combine(target, time.max), tz)
            qs = qs.filter(start_time__range=(day_start, day_end))

        return Response(
            AdminAppointmentSerializer(qs, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminAppointmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = _get_service_for_admin(serializer.validated_data["service_id"])
        add_ons = _get_service_add_ons(serializer.validated_data.get("add_on_ids"), service)
        user = _get_or_create_booking_user(
            serializer.validated_data["customer_email"],
            serializer.validated_data.get("customer_name", ""),
        )

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        total_price, total_duration = _calculate_totals(service, add_ons)
        end_dt = start_dt + timedelta(minutes=total_duration)

        if serializer.validated_data["status"] != AppointmentStatus.CANCELLED:
            _ensure_within_business_hours(start_dt, end_dt)
            _ensure_no_conflict(start_dt, end_dt)

        appointment = Appointment.objects.create(
            user=user,
            service=service,
            start_time=start_dt,
            end_time=end_dt,
            total_price_cents=total_price,
            total_duration_minutes=total_duration,
            notes=serializer.validated_data.get("notes", ""),
            status=serializer.validated_data["status"],
        )
        appointment.add_ons.set(add_ons)
        return Response(
            AdminAppointmentSerializer(appointment).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, appointment_id):
        appointment = _appointment_queryset().filter(id=appointment_id).first()
        if not appointment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if "action" in request.data:
            serializer = AdminAppointmentUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return self._handle_legacy_action(appointment, serializer.validated_data)

        serializer = AdminAppointmentMutationSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        current_start = timezone.localtime(appointment.start_time)
        date_value = data.get("date", current_start.date())
        time_value = data.get(
            "start_time",
            current_start.time().replace(second=0, microsecond=0, tzinfo=None),
        )

        _ensure_aligned(time_value)

        service = (
            _get_service_for_admin(data["service_id"])
            if data.get("service_id")
            else appointment.service
        )
        add_ons = (
            _get_service_add_ons(data.get("add_on_ids"), service)
            if "add_on_ids" in data
            else list(appointment.add_ons.all())
        )
        user = (
            _get_or_create_booking_user(
                data["customer_email"],
                data.get("customer_name", appointment.user.display_name),
            )
            if data.get("customer_email")
            else appointment.user
        )

        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        status_value = data.get("status", appointment.status)
        notes = data.get("notes", appointment.notes)
        total_price, total_duration = _calculate_totals(service, add_ons)
        end_dt = start_dt + timedelta(minutes=total_duration)

        if status_value != AppointmentStatus.CANCELLED:
            _ensure_within_business_hours(start_dt, end_dt)
            _ensure_no_conflict(start_dt, end_dt, exclude_id=appointment.id)

        appointment = _apply_appointment(
            appointment,
            user=user,
            service=service,
            add_ons=add_ons,
            start_dt=start_dt,
            status_value=status_value,
            notes=notes,
        )
        return Response(
            AdminAppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )

    def _handle_legacy_action(self, appointment: Appointment, data: dict):
        action = data["action"]

        if action == "cancel":
            appointment.status = AppointmentStatus.CANCELLED
            appointment.save(update_fields=["status", "updated_at"])
            return Response(
                AdminAppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        if action == "change_status":
            appointment.status = data["status"]
            appointment.save(update_fields=["status", "updated_at"])
            return Response(
                AdminAppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        tz = timezone.get_current_timezone()
        date_value = data["date"]
        time_value = data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=appointment.total_duration_minutes or appointment.service.duration_minutes)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt, exclude_id=appointment.id)

        appointment.start_time = start_dt
        appointment.end_time = end_dt
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["start_time", "end_time", "status", "updated_at"])

        return Response(
            AdminAppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )


class AnalyticsBookingsPerDayView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        month_param = request.query_params.get("month")
        qs = Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)

        if month_param:
            try:
                year, month = month_param.split("-")
                year, month = int(year), int(month)
            except (ValueError, AttributeError):
                raise ValidationError({"month": "month must be in YYYY-MM format."})
            qs = qs.filter(start_time__year=year, start_time__month=month)

        data = (
            qs.annotate(date=TruncDate("start_time"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return Response(list(data), status=status.HTTP_200_OK)


class AnalyticsBookingsPerMonthView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        year_param = request.query_params.get("year")
        qs = Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)

        if year_param:
            try:
                year = int(year_param)
            except ValueError:
                raise ValidationError({"year": "year must be an integer (e.g. 2025)."})
            qs = qs.filter(start_time__year=year)

        data = (
            qs.annotate(month=TruncMonth("start_time"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        return Response(list(data), status=status.HTTP_200_OK)


class AnalyticsTopServicesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        data = (
            Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)
            .values(service_name=F("service__name"))
            .annotate(count=Count("id"))
            .order_by("-count", "service_name")[:10]
        )
        return Response(list(data), status=status.HTTP_200_OK)


class AnalyticsNoShowRateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total = Appointment.objects.exclude(
            status=AppointmentStatus.CANCELLED
        ).count()
        no_shows = Appointment.objects.filter(
            status=AppointmentStatus.NO_SHOW
        ).count()
        rate = (no_shows / total * 100) if total > 0 else 0.0
        return Response(
            {
                "total_appointments": total,
                "no_shows": no_shows,
                "no_show_rate_percent": round(rate, 2),
            },
            status=status.HTTP_200_OK,
        )
