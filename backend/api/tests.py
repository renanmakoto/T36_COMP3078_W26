from datetime import date, datetime, timedelta
from unittest.mock import patch

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .booking_notifications import make_booking_action_token
from .models import AddOn, Appointment, AppointmentStatus, BlogPost, PortfolioItem, Service, Testimonial, User


class BookingAvailabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="client@example.com",
            password="Test1234!",
            display_name="Client",
            role=User.Role.USER,
        )
        self.service = Service.objects.create(
            name="Haircut",
            description="Standard service",
            duration_minutes=45,
            price_cents=5000,
            is_active=True,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="Admin1234!",
            display_name="Admin",
            role=User.Role.ADMIN,
        )

    @patch("api.views.timezone.now")
    def test_availability_hides_past_slots_for_today(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 11, 7), current_tz)

        response = self.client.get("/availability", {"date": "2026-04-01", "duration": 45})

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("10:00", response.data["slots"])
        self.assertNotIn("11:00", response.data["slots"])
        self.assertIn("11:15", response.data["slots"])

    @patch("api.views.timezone.now")
    def test_create_appointment_rejects_past_time(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 11, 0), current_tz)
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/appointments",
            {
                "service_id": str(self.service.id),
                "date": "2026-04-01",
                "start_time": "10:15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["start_time"], "start_time must be in the future.")

    @patch("api.views.timezone.now")
    def test_future_date_keeps_business_slots(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 18, 30), current_tz)

        response = self.client.get("/availability", {"date": "2026-04-02"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["date"], date(2026, 4, 2).isoformat())
        self.assertIn("10:00", response.data["slots"])

    def test_invalid_duration_returns_400(self):
        response = self.client.get("/availability", {"date": "2026-04-02", "duration": "abc"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["duration"], "duration must be a positive integer.")

    @patch("api.views.timezone.now")
    def test_availability_hides_conflicting_slots_for_other_customers(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 9, 0), current_tz)
        start = timezone.make_aware(datetime(2026, 4, 2, 10, 0), current_tz)
        Appointment.objects.create(
            user=self.user,
            service=self.service,
            start_time=start,
            end_time=start + timedelta(minutes=45),
            total_price_cents=5000,
            total_duration_minutes=45,
            status=AppointmentStatus.CONFIRMED,
        )

        response = self.client.get("/availability", {"date": "2026-04-02", "duration": 45})

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("10:00", response.data["slots"])
        self.assertNotIn("10:15", response.data["slots"])
        self.assertNotIn("10:30", response.data["slots"])
        self.assertIn("10:45", response.data["slots"])

    def test_database_constraint_blocks_overlapping_active_appointments(self):
        current_tz = timezone.get_current_timezone()
        start = timezone.make_aware(datetime(2026, 4, 2, 10, 0), current_tz)
        Appointment.objects.create(
            user=self.user,
            service=self.service,
            start_time=start,
            end_time=start + timedelta(minutes=45),
            total_price_cents=5000,
            total_duration_minutes=45,
            status=AppointmentStatus.CONFIRMED,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Appointment.objects.create(
                    user=self.user,
                    service=self.service,
                    start_time=start + timedelta(minutes=15),
                    end_time=start + timedelta(minutes=60),
                    total_price_cents=5000,
                    total_duration_minutes=45,
                    status=AppointmentStatus.CONFIRMED,
                )

    @patch("api.views.timezone.now")
    def test_cannot_reschedule_cancelled_appointment(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 9, 0), current_tz)
        self.client.force_authenticate(self.user)
        appointment = Appointment.objects.create(
            user=self.user,
            service=self.service,
            start_time=timezone.make_aware(datetime(2026, 4, 2, 10, 0), current_tz),
            end_time=timezone.make_aware(datetime(2026, 4, 2, 10, 45), current_tz),
            total_price_cents=5000,
            total_duration_minutes=45,
            status=AppointmentStatus.CANCELLED,
        )

        response = self.client.patch(
            f"/appointments/{appointment.id}",
            {"action": "reschedule", "date": "2026-04-03", "start_time": "10:00"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Cannot reschedule an appointment in its current state.")

    def test_admin_cannot_use_admin_email_as_booking_customer(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/admin/appointments",
            {
                "customer_email": self.admin.email,
                "customer_name": "Admin",
                "service_id": str(self.service.id),
                "date": "2026-04-02",
                "start_time": "10:00",
                "status": "CONFIRMED",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["customer_email"],
            "Admin accounts cannot be used as booking customers.",
        )

    @patch("api.views.timezone.now")
    def test_public_cancel_link_cancels_future_appointment(self, mocked_now):
        current_tz = timezone.get_current_timezone()
        mocked_now.return_value = timezone.make_aware(datetime(2026, 4, 1, 9, 0), current_tz)
        appointment = Appointment.objects.create(
            user=self.user,
            service=self.service,
            start_time=timezone.make_aware(datetime(2026, 4, 2, 10, 0), current_tz),
            end_time=timezone.make_aware(datetime(2026, 4, 2, 10, 45), current_tz),
            total_price_cents=5000,
            total_duration_minutes=45,
            status=AppointmentStatus.CONFIRMED,
        )
        token = make_booking_action_token(appointment, "cancel")

        response = self.client.post("/booking-links/cancel", {"token": token}, format="json")

        self.assertEqual(response.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, AppointmentStatus.CANCELLED)
        self.assertEqual(response.data["result"], "cancelled")

    def test_customer_account_deletion_removes_user_appointments_and_testimonials(self):
        self.client.force_authenticate(self.user)
        appointment = Appointment.objects.create(
            user=self.user,
            service=self.service,
            start_time=timezone.make_aware(datetime(2026, 4, 2, 10, 0), timezone.get_current_timezone()),
            end_time=timezone.make_aware(datetime(2026, 4, 2, 10, 45), timezone.get_current_timezone()),
            total_price_cents=5000,
            total_duration_minutes=45,
            status=AppointmentStatus.CONFIRMED,
        )
        testimonial = Testimonial.objects.create(
            user=self.user,
            service=self.service,
            author_name="Client",
            author_email=self.user.email,
            quote="Great cut.",
            rating=5,
        )

        response = self.client.delete("/auth/account")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["result"], "deleted")
        self.assertFalse(User.objects.filter(id=self.user.id).exists())
        self.assertFalse(Appointment.objects.filter(id=appointment.id).exists())
        self.assertFalse(Testimonial.objects.filter(id=testimonial.id).exists())

    def test_admin_account_deletion_endpoint_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.delete("/auth/account")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["detail"],
            "Admin accounts must be removed through the administrative workflow.",
        )


class AdminContentManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="Admin1234!",
            display_name="Admin",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(self.admin)

    def test_admin_can_delete_service(self):
        service = Service.objects.create(
            name="Haircut",
            description="Standard service",
            duration_minutes=45,
            price_cents=5000,
            is_active=True,
        )

        response = self.client.delete(f"/admin/services/{service.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Service.objects.filter(id=service.id).exists())

    def test_admin_can_delete_add_on(self):
        addon = AddOn.objects.create(
            name="Beard trim",
            description="Line up and trim",
            category="Enhancement",
            price_cents=1500,
            duration_minutes=15,
            is_active=True,
        )

        response = self.client.delete(f"/admin/add-ons/{addon.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(AddOn.objects.filter(id=addon.id).exists())

    def test_admin_can_delete_portfolio_item(self):
        item = PortfolioItem.objects.create(
            title="Fade cut",
            subtitle="Before and after",
            description="Sharp fade",
            image_url="https://example.com/fade.jpg",
            tag="Fade",
            is_published=True,
        )

        response = self.client.delete(f"/admin/portfolio-items/{item.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(PortfolioItem.objects.filter(id=item.id).exists())

    def test_admin_can_delete_blog_post(self):
        post = BlogPost.objects.create(
            title="Hair care tips",
            excerpt="Keep your fade clean.",
            body="Full article body.",
            cover_image_url="https://example.com/blog.jpg",
            created_by=self.admin,
            is_published=True,
        )

        response = self.client.delete(f"/admin/blog-posts/{post.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(BlogPost.objects.filter(id=post.id).exists())
