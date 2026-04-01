# Capstone Backend

Backend API for the booking application, built with Python and Django REST Framework.

This backend provides authentication, service listing, availability calculation, and appointment booking APIs, designed to be consumed by both web and mobile clients.

---

## Tech Stack
- Python
- Django
- Django REST Framework (DRF)
- PostgreSQL
- JWT Authentication (SimpleJWT)

---

## Environment Setup

Create a `.env` file in the `backend/` directory (see `.env.example`).

Required variables:

- `DEBUG` (true / false)
- `SECRET_KEY`
- `DATABASE_URL` (PostgreSQL connection string)
- `ALLOWED_HOSTS`
- `JWT_SECRET_KEY` (or use Django `SECRET_KEY`)

Example:
```env
DEBUG=true
SECRET_KEY=django-secret-key
DATABASE_URL=postgres://user:password@localhost:5432/capstone_db
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## Authentication Flow
- `POST /auth/register` creates a user with email + password.
- `POST /auth/login` returns `access` and `refresh` JWTs and user data.
- All appointment endpoints require `Authorization: Bearer <access-token>`.

---

## Appointment Lifecycle
- `POST /appointments` creates a confirmed appointment.
- `GET /appointments?me=true` returns the authenticated user's appointments.
- `PATCH /appointments/<id>` with `{ "action": "cancel" }` cancels the appointment.
- `PATCH /appointments/<id>` with `{ "action": "reschedule", "date": "YYYY-MM-DD", "start_time": "HH:MM" }`
  reschedules the appointment if the slot is available.

---

## Business Hours
- Slots are in 15-minute increments.
- Business hours are 10:00 to 19:00.
- The last slot starts at 18:45.

---

## Transactional Email (Resend)

The booking system now supports transactional email from the Django backend.
Web and mobile clients do not talk to Resend directly. They only call the booking API.

### Supported events
- Booking created
- Booking rescheduled
- Booking cancelled
- Booking marked as no-show

### Current behavior
- Client notifications are sent to the appointment email.
- Owner notifications are sent to `RESEND_OWNER_EMAIL`.
- Emails are sent only after the booking change is committed.
- Each send is tracked in `AppointmentEmailNotification`.
- Resend webhook events can be received at `POST /webhooks/resend`.

### Required environment variables
```env
BOOKING_EMAILS_ENABLED=true
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=bookings@mail.example.com
RESEND_OWNER_EMAIL=owner@example.com
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxx
FRONTEND_BASE_URL=https://your-frontend-host
BUSINESS_NAME=BrazWebDes Hairstylist Booking
BUSINESS_ADDRESS=Toronto, ON
BUSINESS_PHONE=+1 000 000 0000
BOOKING_REPLY_TO=support@example.com
```

### Notes
- The `from` address must belong to a verified domain in Resend.
- Current email action links send users into the authenticated web flow.
- Public one-click cancel/reschedule links are not implemented yet and should use signed tokens when added.
