from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminAddOnDetailView,
    AdminAddOnListCreateView,
    AdminAppointmentListCreateView,
    AdminAppointmentUpdateView,
    AdminBlogPostDetailView,
    AdminBlogPostListCreateView,
    AdminImageUploadView,
    AdminPortfolioItemDetailView,
    AdminPortfolioItemListCreateView,
    AdminServiceDetailView,
    AdminServiceListCreateView,
    AdminTestimonialDetailView,
    AdminTestimonialListCreateView,
    AnalyticsBookingsPerDayView,
    AnalyticsBookingsPerMonthView,
    AnalyticsOverviewView,
    AnalyticsNoShowRateView,
    AnalyticsTopServicesView,
    AppointmentListCreateView,
    BookingEmailCancelView,
    BookingEmailLinkView,
    BookingEmailRescheduleView,
    AppointmentUpdateView,
    AvailabilityView,
    BlogPostDetailView,
    BlogPostListView,
    HomeContentView,
    LoginView,
    PortfolioItemListView,
    RegisterView,
    ResendWebhookView,
    ServiceListView,
    TestimonialListCreateView,
)

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/token/refresh", TokenRefreshView.as_view(), name="token-refresh"),

    path("home-content", HomeContentView.as_view(), name="home-content"),
    path("services", ServiceListView.as_view(), name="services-list"),
    path("portfolio", PortfolioItemListView.as_view(), name="portfolio-list"),
    path("blog-posts", BlogPostListView.as_view(), name="blog-post-list"),
    path("blog-posts/<slug:slug>", BlogPostDetailView.as_view(), name="blog-post-detail"),
    path("testimonials", TestimonialListCreateView.as_view(), name="testimonials"),
    path("availability", AvailabilityView.as_view(), name="availability"),
    path("webhooks/resend", ResendWebhookView.as_view(), name="resend-webhook"),
    path("booking-links/resolve", BookingEmailLinkView.as_view(), name="booking-link-resolve"),
    path("booking-links/cancel", BookingEmailCancelView.as_view(), name="booking-link-cancel"),
    path("booking-links/reschedule", BookingEmailRescheduleView.as_view(), name="booking-link-reschedule"),

    path("appointments", AppointmentListCreateView.as_view(), name="appointments"),
    path(
        "appointments/<uuid:appointment_id>",
        AppointmentUpdateView.as_view(),
        name="appointment-update",
    ),

    path("admin/services", AdminServiceListCreateView.as_view(), name="admin-services"),
    path(
        "admin/services/<uuid:pk>",
        AdminServiceDetailView.as_view(),
        name="admin-service-detail",
    ),
    path("admin/add-ons", AdminAddOnListCreateView.as_view(), name="admin-add-ons"),
    path("admin/uploads/image", AdminImageUploadView.as_view(), name="admin-image-upload"),
    path(
        "admin/add-ons/<uuid:pk>",
        AdminAddOnDetailView.as_view(),
        name="admin-add-on-detail",
    ),
    path(
        "admin/portfolio-items",
        AdminPortfolioItemListCreateView.as_view(),
        name="admin-portfolio-items",
    ),
    path(
        "admin/portfolio-items/<uuid:pk>",
        AdminPortfolioItemDetailView.as_view(),
        name="admin-portfolio-item-detail",
    ),
    path(
        "admin/blog-posts",
        AdminBlogPostListCreateView.as_view(),
        name="admin-blog-posts",
    ),
    path(
        "admin/blog-posts/<uuid:pk>",
        AdminBlogPostDetailView.as_view(),
        name="admin-blog-post-detail",
    ),
    path(
        "admin/testimonials",
        AdminTestimonialListCreateView.as_view(),
        name="admin-testimonials",
    ),
    path(
        "admin/testimonials/<uuid:pk>",
        AdminTestimonialDetailView.as_view(),
        name="admin-testimonial-detail",
    ),
    path(
        "admin/appointments",
        AdminAppointmentListCreateView.as_view(),
        name="admin-appointments",
    ),
    path(
        "admin/appointments/<uuid:appointment_id>",
        AdminAppointmentUpdateView.as_view(),
        name="admin-appointment-update",
    ),

    path(
        "admin/analytics/overview",
        AnalyticsOverviewView.as_view(),
        name="analytics-overview",
    ),
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
