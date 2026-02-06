"""
Management command to seed the database with sample data.

Usage:
    python manage.py seed_data          # seed everything
    python manage.py seed_data --flush  # wipe tables first, then seed
"""

from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import AddOn, Appointment, AppointmentStatus, Service, User


class Command(BaseCommand):
    help = "Seed the database with services, add-ons, test users, and appointments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing seed-able data before inserting.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write("Flushing existing data …")
            Appointment.objects.all().delete()
            AddOn.objects.all().delete()
            Service.objects.all().delete()
            User.objects.filter(role=User.Role.USER).delete()
            # Keep admin users unless you explicitly want them removed

        self._seed_services()
        self._seed_addons()
        users = self._seed_users()
        self._seed_appointments(users)
        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    # ------------------------------------------------------------------
    # Services
    # ------------------------------------------------------------------

    def _seed_services(self):
        services = [
            {
                "name": "Haircut",
                "description": "Classic men's haircut with scissors or clippers.",
                "duration_minutes": 30,
                "price_cents": 4000,
            },
            {
                "name": "Beard Trim",
                "description": "Shape and trim beard with hot towel finish.",
                "duration_minutes": 15,
                "price_cents": 2000,
            },
            {
                "name": "Haircut + Beard",
                "description": "Full haircut and beard trim combo.",
                "duration_minutes": 45,
                "price_cents": 5500,
            },
            {
                "name": "Eyebrow Grooming",
                "description": "Eyebrow shaping and trimming.",
                "duration_minutes": 15,
                "price_cents": 1500,
            },
            {
                "name": "Hair Coloring",
                "description": "Professional hair coloring service.",
                "duration_minutes": 60,
                "price_cents": 8000,
            },
            {
                "name": "Kids Haircut",
                "description": "Haircut for children under 12.",
                "duration_minutes": 30,
                "price_cents": 3000,
            },
        ]
        for svc in services:
            obj, created = Service.objects.get_or_create(
                name=svc["name"],
                defaults=svc,
            )
            status_msg = "created" if created else "already exists"
            self.stdout.write(f"  Service '{obj.name}' {status_msg}")

    # ------------------------------------------------------------------
    # Add-ons
    # ------------------------------------------------------------------

    def _seed_addons(self):
        addons = [
            {
                "name": "Hot Towel",
                "description": "Relaxing hot towel treatment.",
                "price_cents": 500,
                "duration_minutes": 5,
            },
            {
                "name": "Beard Oil Treatment",
                "description": "Premium beard oil application.",
                "price_cents": 800,
                "duration_minutes": 5,
            },
            {
                "name": "Hair Wash",
                "description": "Shampoo and conditioner wash.",
                "price_cents": 1000,
                "duration_minutes": 10,
            },
            {
                "name": "Scalp Massage",
                "description": "Soothing scalp massage treatment.",
                "price_cents": 1200,
                "duration_minutes": 10,
            },
        ]
        for addon in addons:
            obj, created = AddOn.objects.get_or_create(
                name=addon["name"],
                defaults=addon,
            )
            status_msg = "created" if created else "already exists"
            self.stdout.write(f"  Add-on '{obj.name}' {status_msg}")

    # ------------------------------------------------------------------
    # Test users
    # ------------------------------------------------------------------

    def _seed_users(self):
        users_data = [
            {
                "email": "admin@brazwebdes.com",
                "password": "Admin1234!",
                "role": User.Role.ADMIN,
                "is_staff": True,
            },
            {
                "email": "daniel@example.com",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "ahmed@example.com",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "michael@example.com",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
            {
                "email": "christopher@example.com",
                "password": "Test1234!",
                "role": User.Role.USER,
            },
        ]
        created_users = []
        for u in users_data:
            email = u["email"]
            existing = User.objects.filter(email=email).first()
            if existing:
                self.stdout.write(f"  User '{email}' already exists")
                created_users.append(existing)
            else:
                user = User.objects.create_user(
                    email=email,
                    password=u["password"],
                    role=u["role"],
                    is_staff=u.get("is_staff", False),
                )
                self.stdout.write(f"  User '{email}' created")
                created_users.append(user)
        return created_users

    # ------------------------------------------------------------------
    # Test appointments
    # ------------------------------------------------------------------

    def _seed_appointments(self, users):
        services = list(Service.objects.filter(is_active=True))
        if not services:
            self.stdout.write(self.style.WARNING("  No services found – skipping appointments."))
            return

        # Skip the admin user (index 0) for customer appointments
        customers = [u for u in users if u.role == User.Role.USER]
        if not customers:
            self.stdout.write(self.style.WARNING("  No customer users – skipping appointments."))
            return

        tz = timezone.get_current_timezone()
        today = timezone.now().date()

        appointments_data = [
            # Past appointments
            {
                "user": customers[0],
                "service": services[0],  # Haircut
                "date": today - timedelta(days=7),
                "hour": 10,
                "minute": 0,
                "status": AppointmentStatus.CONFIRMED,
            },
            {
                "user": customers[1],
                "service": services[1],  # Beard Trim
                "date": today - timedelta(days=5),
                "hour": 11,
                "minute": 0,
                "status": AppointmentStatus.CONFIRMED,
            },
            {
                "user": customers[0],
                "service": services[2] if len(services) > 2 else services[0],
                "date": today - timedelta(days=3),
                "hour": 14,
                "minute": 0,
                "status": AppointmentStatus.NO_SHOW,
            },
            {
                "user": customers[2] if len(customers) > 2 else customers[0],
                "service": services[0],  # Haircut
                "date": today - timedelta(days=2),
                "hour": 15,
                "minute": 30,
                "status": AppointmentStatus.CANCELLED,
            },
            # Future appointments
            {
                "user": customers[0],
                "service": services[0],  # Haircut
                "date": today + timedelta(days=1),
                "hour": 10,
                "minute": 30,
                "status": AppointmentStatus.CONFIRMED,
            },
            {
                "user": customers[1],
                "service": services[2] if len(services) > 2 else services[0],
                "date": today + timedelta(days=2),
                "hour": 13,
                "minute": 0,
                "status": AppointmentStatus.PENDING,
            },
            {
                "user": customers[3] if len(customers) > 3 else customers[0],
                "service": services[1],  # Beard Trim
                "date": today + timedelta(days=3),
                "hour": 16,
                "minute": 0,
                "status": AppointmentStatus.CONFIRMED,
            },
            {
                "user": customers[2] if len(customers) > 2 else customers[0],
                "service": services[4] if len(services) > 4 else services[0],
                "date": today + timedelta(days=5),
                "hour": 11,
                "minute": 15,
                "status": AppointmentStatus.PENDING,
            },
        ]

        for apt in appointments_data:
            start = timezone.make_aware(
                datetime.combine(
                    apt["date"],
                    datetime.min.replace(hour=apt["hour"], minute=apt["minute"]).time(),
                ),
                tz,
            )
            end = start + timedelta(minutes=apt["service"].duration_minutes)
            Appointment.objects.create(
                user=apt["user"],
                service=apt["service"],
                start_time=start,
                end_time=end,
                status=apt["status"],
            )
            self.stdout.write(
                f"  Appointment: {apt['user'].email} – {apt['service'].name} "
                f"@ {start.strftime('%Y-%m-%d %H:%M')} [{apt['status']}]"
            )
