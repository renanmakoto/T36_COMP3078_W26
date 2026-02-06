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
