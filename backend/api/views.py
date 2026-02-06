from datetime import datetime, time, timedelta

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Appointment, AppointmentStatus, Service
from .serializers import (
    AppointmentCreateSerializer,
    AppointmentSerializer,
    AppointmentUpdateSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    ServiceSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "Email already registered."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ServiceListView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(is_active=True).order_by("name")


class AvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date query parameter is required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "date must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tz = timezone.get_current_timezone()
        day_start = datetime.combine(target_date, time(10, 0))
        day_end = datetime.combine(target_date, time(19, 0))
        slot_minutes = 15

        slots = []
        current = day_start
        while current + timedelta(minutes=slot_minutes) <= day_end:
            slots.append(current)
            current += timedelta(minutes=slot_minutes)

        slot_windows = [
            (
                timezone.make_aware(slot, tz),
                timezone.make_aware(slot + timedelta(minutes=slot_minutes), tz),
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


def _is_aligned_to_grid(value: time, minutes: int = 15) -> bool:
    return value.minute % minutes == 0 and value.second == 0 and value.microsecond == 0


def _within_business_hours(start_dt: datetime, end_dt: datetime) -> bool:
    day_start = datetime.combine(start_dt.date(), time(10, 0), tzinfo=start_dt.tzinfo)
    day_end = datetime.combine(start_dt.date(), time(19, 0), tzinfo=start_dt.tzinfo)
    return start_dt >= day_start and end_dt <= day_end


class AppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.query_params.get("me") != "true":
            return Response(
                {"detail": "Query parameter me=true is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

        service = Service.objects.filter(
            id=serializer.validated_data["service_id"], is_active=True
        ).first()
        if not service:
            return Response(
                {"detail": "Service not found or inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tz = timezone.get_current_timezone()
        date_value = serializer.validated_data["date"]
        time_value = serializer.validated_data["start_time"]

        if not _is_aligned_to_grid(time_value):
            return Response(
                {"detail": "start_time must align to a 15-minute grid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=service.duration_minutes)

        if not _within_business_hours(start_dt, end_dt):
            return Response(
                {"detail": "start_time must be within business hours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conflict = Appointment.objects.exclude(
            status=AppointmentStatus.CANCELLED
        ).filter(
            start_time__lt=end_dt,
            end_time__gt=start_dt,
        ).exists()
        if conflict:
            return Response(
                {"detail": "Requested time overlaps an existing appointment."},
                status=status.HTTP_409_CONFLICT,
            )

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

        if not _is_aligned_to_grid(time_value):
            return Response(
                {"detail": "start_time must align to a 15-minute grid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_dt = timezone.make_aware(datetime.combine(date_value, time_value), tz)
        end_dt = start_dt + timedelta(minutes=appointment.service.duration_minutes)

        if not _within_business_hours(start_dt, end_dt):
            return Response(
                {"detail": "start_time must be within business hours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conflict = Appointment.objects.exclude(
            status=AppointmentStatus.CANCELLED
        ).exclude(
            id=appointment.id
        ).filter(
            start_time__lt=end_dt,
            end_time__gt=start_dt,
        ).exists()
        if conflict:
            return Response(
                {"detail": "Requested time overlaps an existing appointment."},
                status=status.HTTP_409_CONFLICT,
            )

        appointment.start_time = start_dt
        appointment.end_time = end_dt
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["start_time", "end_time", "status"])

        return Response(
            AppointmentSerializer(appointment).data,
            status=status.HTTP_200_OK,
        )
