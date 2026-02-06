from django.urls import path

from .views import (
    AppointmentListCreateView,
    AppointmentUpdateView,
    AvailabilityView,
    LoginView,
    RegisterView,
    ServiceListView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("services", ServiceListView.as_view(), name="services-list"),
    path("availability", AvailabilityView.as_view(), name="availability"),
    path("appointments", AppointmentListCreateView.as_view(), name="appointments"),
    path(
        "appointments/<uuid:appointment_id>",
        AppointmentUpdateView.as_view(),
        name="appointment-update",
    ),
]
