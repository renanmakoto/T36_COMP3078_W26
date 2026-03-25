"""
Management command to seed the database with sample data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --flush
"""

from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
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


class Command(BaseCommand):
    help = "Seed services, add-ons, users, appointments, portfolio items, blog posts, and testimonials."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed-able data before inserting.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data ...")
            Appointment.objects.all().delete()
            Testimonial.objects.all().delete()
            BlogPost.objects.all().delete()
            PortfolioItem.objects.all().delete()
            Service.objects.all().delete()
            AddOn.objects.all().delete()
            User.objects.filter(role=User.Role.USER).delete()
            User.objects.filter(email="admin@brazwebdes.com", is_superuser=False).delete()

        services = self._seed_services()
        add_ons = self._seed_add_ons()
        self._attach_add_ons(services, add_ons)
        users = self._seed_users()
        self._seed_portfolio()
        self._seed_blog_posts(users["admin"])
        self._seed_testimonials(users, services)
        self._seed_appointments(users, services, add_ons)
        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    def _seed_services(self):
        items = [
            {
                "name": "Haircut",
                "description": "Fresh fade, taper, or classic cut tailored to the client.",
                "image_url": "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80",
                "payment_note": "Cash or e-transfer preferred.",
                "duration_minutes": 45,
                "price_cents": 5085,
                "sort_order": 1,
                "is_featured_home": True,
                "home_order": 1,
            },
            {
                "name": "Haircut + Beard",
                "description": "Full haircut with beard trim and detailed finish.",
                "image_url": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=80",
                "payment_note": "Cash or e-transfer preferred.",
                "duration_minutes": 60,
                "price_cents": 6500,
                "sort_order": 2,
                "is_featured_home": True,
                "home_order": 2,
            },
            {
                "name": "Classic Cut",
                "description": "Business-friendly classic cut with scissor detailing.",
                "image_url": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80",
                "payment_note": "Cash or e-transfer preferred.",
                "duration_minutes": 40,
                "price_cents": 4500,
                "sort_order": 3,
                "is_featured_home": True,
                "home_order": 3,
            },
            {
                "name": "Beard Trim",
                "description": "Shape, trim, lineup, and finish.",
                "image_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
                "payment_note": "Cash or e-transfer preferred.",
                "duration_minutes": 20,
                "price_cents": 2500,
                "sort_order": 4,
            },
        ]

        services = {}
        for item in items:
            service, _ = Service.objects.update_or_create(
                name=item["name"],
                defaults=item,
            )
            services[item["name"]] = service
            self.stdout.write(f"  Service '{service.name}' ready")
        return services

    def _seed_add_ons(self):
        items = [
            {
                "name": "Eyebrow Shaping",
                "description": "Clean shaping and detail work.",
                "category": "Enhancement",
                "price_cents": 600,
                "duration_minutes": 10,
                "sort_order": 1,
            },
            {
                "name": "Beard Trim Add-on",
                "description": "Quick beard cleanup to pair with a haircut.",
                "category": "Enhancement",
                "price_cents": 900,
                "duration_minutes": 15,
                "sort_order": 2,
            },
            {
                "name": "Hair Wash",
                "description": "Rinse and wash before the service.",
                "category": "Prep",
                "price_cents": 500,
                "duration_minutes": 15,
                "sort_order": 3,
            },
            {
                "name": "Design",
                "description": "Custom line or shaved design.",
                "category": "Enhancement",
                "price_cents": 500,
                "duration_minutes": 15,
                "sort_order": 4,
            },
            {
                "name": "Hot Towel",
                "description": "Relaxing hot towel finish.",
                "category": "Enhancement",
                "price_cents": 600,
                "duration_minutes": 10,
                "sort_order": 5,
            },
        ]

        add_ons = {}
        for item in items:
            add_on, _ = AddOn.objects.update_or_create(
                name=item["name"],
                defaults=item,
            )
            add_ons[item["name"]] = add_on
            self.stdout.write(f"  Add-on '{add_on.name}' ready")
        return add_ons

    def _attach_add_ons(self, services, add_ons):
        services["Haircut"].available_add_ons.set(
            [
                add_ons["Eyebrow Shaping"],
                add_ons["Hair Wash"],
                add_ons["Design"],
                add_ons["Hot Towel"],
            ]
        )
        services["Haircut + Beard"].available_add_ons.set(
            [
                add_ons["Eyebrow Shaping"],
                add_ons["Hair Wash"],
                add_ons["Design"],
                add_ons["Hot Towel"],
                add_ons["Beard Trim Add-on"],
            ]
        )
        services["Classic Cut"].available_add_ons.set(
            [
                add_ons["Eyebrow Shaping"],
                add_ons["Hair Wash"],
                add_ons["Design"],
            ]
        )
        services["Beard Trim"].available_add_ons.set(
            [
                add_ons["Hot Towel"],
            ]
        )

    def _seed_users(self):
        users_data = [
            {
                "email": "admin@brazwebdes.com",
                "display_name": "Erik",
                "password": "Admin1234!",
                "role": User.Role.ADMIN,
                "is_staff": True,
            },
            {
                "email": "daniel@example.com",
                "display_name": "Daniel Johnson",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "ahmed@example.com",
                "display_name": "Ahmed Ali",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "michael@example.com",
                "display_name": "Michael Reyes",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "christopher@example.com",
                "display_name": "Christopher Wong",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
        ]

        users = {}
        for item in users_data:
            email = item["email"]
            existing = User.objects.filter(email=email).first()
            if existing:
                existing.display_name = item["display_name"]
                existing.role = item["role"]
                existing.is_staff = item.get("is_staff", False)
                existing.set_password(item["password"])
                existing.save(update_fields=["display_name", "role", "is_staff", "password"])
                user = existing
            else:
                user = User.objects.create_user(
                    email=email,
                    password=item["password"],
                    display_name=item["display_name"],
                    role=item["role"],
                    is_staff=item.get("is_staff", False),
                )
            users["admin" if item["role"] == User.Role.ADMIN else email] = user
            self.stdout.write(f"  User '{email}' ready")
        return users

    def _seed_portfolio(self):
        items = [
            {
                "title": "Low fade with texture",
                "subtitle": "Fresh cut tailored to the client's natural growth",
                "description": "Balanced low fade with soft texture on top for an everyday look.",
                "image_url": "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=80",
                "tag": "Fade",
                "is_published": True,
                "is_featured_home": True,
                "home_order": 1,
            },
            {
                "title": "Classic side part",
                "subtitle": "Polished finish for a clean professional look",
                "description": "Scissor work and soft taper built for easy styling.",
                "image_url": "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80",
                "tag": "Classic",
                "is_published": True,
                "is_featured_home": True,
                "home_order": 2,
            },
            {
                "title": "Haircut with beard blend",
                "subtitle": "Seamless transition from temples into beard",
                "description": "Balanced proportions with detailed beard shaping.",
                "image_url": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80",
                "tag": "Beard",
                "is_published": True,
                "is_featured_home": True,
                "home_order": 3,
            },
        ]

        for item in items:
            PortfolioItem.objects.update_or_create(
                title=item["title"],
                defaults=item,
            )
            self.stdout.write(f"  Portfolio item '{item['title']}' ready")

    def _seed_blog_posts(self, admin_user: User):
        items = [
            {
                "title": "How to make your fade last longer",
                "excerpt": "Simple maintenance tips clients can follow between appointments.",
                "body": (
                    "A fade looks sharp when the sides stay clean and the top is easy to style. "
                    "This post covers brush habits, quick lineup care, and when to rebook."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1512690459411-b0fd1c86b8f8?auto=format&fit=crop&w=1200&q=80",
                "tags": ["Haircut", "Maintenance"],
                "is_published": True,
                "is_featured_home": True,
                "home_order": 1,
                "created_by": admin_user,
            },
            {
                "title": "Choosing the right add-on for your appointment",
                "excerpt": "When eyebrow shaping, beard detailing, or a wash actually makes sense.",
                "body": (
                    "Add-ons should support the result you want, not just extend the appointment. "
                    "Here is how Erik recommends pairing extras with the main cut."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1503951458645-643d53bfd90f?auto=format&fit=crop&w=1200&q=80",
                "tags": ["Add-ons", "Consultation"],
                "is_published": True,
                "is_featured_home": True,
                "home_order": 2,
                "created_by": admin_user,
            },
            {
                "title": "Booking the best time for your routine",
                "excerpt": "How to pick an appointment slot that fits your schedule and growth pattern.",
                "body": (
                    "Whether you prefer weekly cleanups or a two-week cycle, your booking time "
                    "affects how easy it is to keep the look consistent."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
                "tags": ["Booking", "Routine"],
                "is_published": True,
                "is_featured_home": True,
                "home_order": 3,
                "created_by": admin_user,
            },
        ]

        for item in items:
            BlogPost.objects.update_or_create(
                title=item["title"],
                defaults=item,
            )
            self.stdout.write(f"  Blog post '{item['title']}' ready")

    def _seed_testimonials(self, users, services):
        items = [
            {
                "user": users["daniel@example.com"],
                "service": services["Haircut + Beard"],
                "author_name": "Daniel Johnson",
                "author_email": "daniel@example.com",
                "quote": "I booked during a break and the reminder plus the result were both on point.",
                "rating": 5,
                "status": TestimonialStatus.APPROVED,
                "is_featured_home": True,
                "home_order": 1,
            },
            {
                "user": users["ahmed@example.com"],
                "service": services["Haircut"],
                "author_name": "Ahmed Ali",
                "author_email": "ahmed@example.com",
                "quote": "Rescheduling online was easy and Erik still kept the same attention to detail.",
                "rating": 5,
                "status": TestimonialStatus.APPROVED,
                "is_featured_home": True,
                "home_order": 2,
            },
            {
                "user": users["michael@example.com"],
                "service": services["Classic Cut"],
                "author_name": "Michael Reyes",
                "author_email": "michael@example.com",
                "quote": "Great consultation before the cut. The classic style came out exactly as discussed.",
                "rating": 4,
                "status": TestimonialStatus.APPROVED,
                "is_featured_home": True,
                "home_order": 3,
            },
        ]

        for item in items:
            Testimonial.objects.update_or_create(
                author_email=item["author_email"],
                quote=item["quote"],
                defaults=item,
            )
            self.stdout.write(f"  Testimonial from '{item['author_name']}' ready")

    def _seed_appointments(self, users, services, add_ons):
        tz = timezone.get_current_timezone()
        today = timezone.now().date()

        items = [
            {
                "user": users["daniel@example.com"],
                "service": services["Haircut"],
                "add_ons": [add_ons["Eyebrow Shaping"]],
                "date": today - timedelta(days=7),
                "hour": 10,
                "minute": 0,
                "status": AppointmentStatus.CONFIRMED,
                "notes": "Booked by customer online.",
            },
            {
                "user": users["ahmed@example.com"],
                "service": services["Beard Trim"],
                "add_ons": [add_ons["Hot Towel"]],
                "date": today - timedelta(days=5),
                "hour": 11,
                "minute": 0,
                "status": AppointmentStatus.CONFIRMED,
                "notes": "Quick refresh appointment.",
            },
            {
                "user": users["daniel@example.com"],
                "service": services["Haircut + Beard"],
                "add_ons": [add_ons["Hair Wash"]],
                "date": today - timedelta(days=3),
                "hour": 14,
                "minute": 0,
                "status": AppointmentStatus.NO_SHOW,
                "notes": "Client missed the slot.",
            },
            {
                "user": users["michael@example.com"],
                "service": services["Classic Cut"],
                "add_ons": [],
                "date": today + timedelta(days=1),
                "hour": 10,
                "minute": 30,
                "status": AppointmentStatus.CONFIRMED,
                "notes": "First-time customer booking.",
            },
            {
                "user": users["christopher@example.com"],
                "service": services["Haircut + Beard"],
                "add_ons": [add_ons["Design"], add_ons["Eyebrow Shaping"]],
                "date": today + timedelta(days=2),
                "hour": 13,
                "minute": 0,
                "status": AppointmentStatus.PENDING,
                "notes": "Requested design reference photo.",
            },
        ]

        for item in items:
            start = timezone.make_aware(
                datetime.combine(
                    item["date"],
                    datetime.min.replace(hour=item["hour"], minute=item["minute"]).time(),
                ),
                tz,
            )
            total_price = item["service"].price_cents + sum(add_on.price_cents for add_on in item["add_ons"])
            total_duration = item["service"].duration_minutes + sum(
                add_on.duration_minutes for add_on in item["add_ons"]
            )
            end = start + timedelta(minutes=total_duration)

            appointment, _ = Appointment.objects.update_or_create(
                user=item["user"],
                service=item["service"],
                start_time=start,
                defaults={
                    "end_time": end,
                    "total_price_cents": total_price,
                    "total_duration_minutes": total_duration,
                    "status": item["status"],
                    "notes": item["notes"],
                },
            )
            appointment.add_ons.set(item["add_ons"])
            self.stdout.write(
                f"  Appointment: {item['user'].email} - {item['service'].name} "
                f"@ {start.strftime('%Y-%m-%d %H:%M')} [{item['status']}]"
            )
