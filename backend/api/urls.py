from django.urls import path

from .views import (
    AdminAppointmentListView,
    AdminAppointmentUpdateView,
    AnalyticsBookingsPerDayView,
    AnalyticsBookingsPerMonthView,
    AnalyticsNoShowRateView,
    AnalyticsTopServicesView,
    AppointmentListCreateView,
    AppointmentUpdateView,
    AvailabilityView,
    LoginView,
    RegisterView,
    ServiceListView,
)

urlpatterns = [
    # Auth
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),

    # Public
    path("services", ServiceListView.as_view(), name="services-list"),
    path("availability", AvailabilityView.as_view(), name="availability"),

    # User-facing appointments
    path("appointments", AppointmentListCreateView.as_view(), name="appointments"),
    path(
        "appointments/<uuid:appointment_id>",
        AppointmentUpdateView.as_view(),
        name="appointment-update",
    ),

    # Admin appointments
    path(
        "admin/appointments",
        AdminAppointmentListView.as_view(),
        name="admin-appointments",
    ),
    path(
        "admin/appointments/<uuid:appointment_id>",
        AdminAppointmentUpdateView.as_view(),
        name="admin-appointment-update",
    ),

    # Analytics (admin only)
    path(
        "admin/analytics/bookings-per-day",
        AnalyticsBookingsPerDayView.as_view(),
        name="analytics-bookings-per-day",
    ),
    path(
        "admin/analytics/bookings-per-month",
        AnalyticsBookingsPerMonthView.as_view(),
        name="analytics-bookings-per-month",
    ),
    path(
        "admin/analytics/top-services",
        AnalyticsTopServicesView.as_view(),
        name="analytics-top-services",
    ),
    path(
        "admin/analytics/no-show-rate",
        AnalyticsNoShowRateView.as_view(),
        name="analytics-no-show-rate",
    ),
]
