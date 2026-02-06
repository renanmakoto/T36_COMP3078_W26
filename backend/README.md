# Capstone Backend

Backend API for the booking application.

## Tech Stack
- Fastify
- TypeScript
- Prisma
- PostgreSQL

## Environment
Create a `.env` file (see `.env.example`):

- `PORT` (default 3000)
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET`

## Install
```bash
npm install
```

## Migrate
```bash
npx prisma migrate dev
npx prisma generate
```

## Seed
```bash
npx prisma db seed
```

## Run Locally
```bash
npm run dev
```

## Build + Start
```bash
npm run build
npm start
```

## Example API Calls

### POST /auth/register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

### POST /auth/login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

### GET /services
```bash
curl http://localhost:3000/services
```

### GET /availability
```bash
curl "http://localhost:3000/availability?date=2026-02-10"
```

### POST /appointments
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"<SERVICE_ID>","date":"2026-02-10","startTime":"10:00"}'
```

### GET /appointments?me=true
```bash
curl "http://localhost:3000/appointments?me=true" \
  -H "Authorization: Bearer <TOKEN>"
```

### PATCH /appointments/:id
```bash
curl -X PATCH http://localhost:3000/appointments/<APPOINTMENT_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"cancel"}'
```
