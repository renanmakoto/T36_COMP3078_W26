from datetime import datetime, time, timedelta

from django.db import IntegrityError
from django.db.models import Count, F, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Appointment, AppointmentStatus, Service
from .permissions import IsAdmin
from .serializers import (
    AdminAppointmentSerializer,
    AdminAppointmentUpdateSerializer,
    AppointmentCreateSerializer,
    AppointmentSerializer,
    AppointmentUpdateSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    ServiceSerializer,
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


def _get_active_service(service_id):
    service = Service.objects.filter(id=service_id, is_active=True).first()
    if not service:
        raise ValidationError({"service_id": "Service not found or inactive."})
    return service


def _ensure_no_conflict(start_dt: datetime, end_dt: datetime, exclude_id=None):
    qs = Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    conflict = qs.filter(start_time__lt=end_dt, end_time__gt=start_dt).exists()
    if conflict:
        raise ValidationError({"detail": "Requested time overlaps an existing appointment."})


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


class ServiceListView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(is_active=True).order_by("name")


class AvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        target_date = _parse_date_param(request.query_params.get("date"))

        # Optional: narrow available slots to those where a specific service fits.
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
        appointments = (
            Appointment.objects.filter(user=request.user)
            .select_related("service")
            .order_by("-start_time")
        )
        return Response(
            AppointmentSerializer(appointments, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AppointmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = _get_active_service(serializer.validated_data["service_id"])

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=service.duration_minutes)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt)

        appointment = Appointment.objects.create(
            user=request.user,
            service=service,
            start_time=start_dt,
            end_time=end_dt,
            status=AppointmentStatus.CONFIRMED,
        )
        return Response(
            AppointmentSerializer(appointment).data,
            status=status.HTTP_201_CREATED,
        )


class AppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_id):
        serializer = AppointmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = Appointment.objects.filter(
            id=appointment_id, user=request.user
        ).select_related("service").first()
        if not appointment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        action = serializer.validated_data["action"]
        if action == "cancel":
            appointment.status = AppointmentStatus.CANCELLED
            appointment.save(update_fields=["status"])
            return Response(
                AppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=appointment.service.duration_minutes)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt, exclude_id=appointment.id)

        appointment.start_time = start_dt
        appointment.end_time = end_dt
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["start_time", "end_time", "status"])

        return Response(
            AppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Admin APIs
# ---------------------------------------------------------------------------


class AdminAppointmentListView(APIView):
    """GET /admin/appointments – list all appointments (admin only)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = Appointment.objects.select_related("service", "user").order_by("-start_time")

        # Optional filters
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


class AdminAppointmentUpdateView(APIView):
    """PATCH /admin/appointments/:id – edit / cancel / change status (admin only)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, appointment_id):
        serializer = AdminAppointmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = (
            Appointment.objects.filter(id=appointment_id)
            .select_related("service", "user")
            .first()
        )
        if not appointment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        action = serializer.validated_data["action"]

        if action == "cancel":
            appointment.status = AppointmentStatus.CANCELLED
            appointment.save(update_fields=["status"])
            return Response(
                AdminAppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        if action == "change_status":
            new_status = serializer.validated_data["status"]
            appointment.status = new_status
            appointment.save(update_fields=["status"])
            return Response(
                AdminAppointmentSerializer(appointment).data,
                status=status.HTTP_200_OK,
            )

        # action == "reschedule"
        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        _ensure_aligned(time_value)
        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=appointment.service.duration_minutes)
        _ensure_within_business_hours(start_dt, end_dt)
        _ensure_no_conflict(start_dt, end_dt, exclude_id=appointment.id)

        appointment.start_time = start_dt
        appointment.end_time = end_dt
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["start_time", "end_time", "status"])

        return Response(
            AdminAppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------


class AnalyticsBookingsPerDayView(APIView):
    """GET /admin/analytics/bookings-per-day?month=YYYY-MM"""

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
    """GET /admin/analytics/bookings-per-month?year=YYYY"""

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
    """GET /admin/analytics/top-services"""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = Appointment.objects.exclude(status=AppointmentStatus.CANCELLED)
        data = (
            qs.values(service_name=F("service__name"))
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        return Response(list(data), status=status.HTTP_200_OK)


class AnalyticsNoShowRateView(APIView):
    """GET /admin/analytics/no-show-rate"""

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
