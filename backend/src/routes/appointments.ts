import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { requireAuth } from '../middlewares/requireAuth';

const SLOT_MINUTES = 15;
const OPEN_MINUTES = 10 * 60;
const CLOSE_MINUTES = 19 * 60;

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return false;
  return true;
}

function minutesSinceMidnight(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatTime(value: Date) {
  const h = String(value.getHours()).padStart(2, '0');
  const m = String(value.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export async function appointmentsRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body as { serviceId?: string; startTime?: string; date?: string };
    const { serviceId, startTime, date } = body;

    if (!serviceId || !startTime || !date) {
      return reply.status(400).send({ error: 'serviceId, startTime, and date are required.' });
    }

    if (!isValidDate(date) || !isValidTime(startTime)) {
      return reply.status(400).send({ error: 'Invalid date or time format.' });
    }

    const startMinutes = minutesSinceMidnight(startTime);
    if (startMinutes % SLOT_MINUTES !== 0) {
      return reply.status(400).send({ error: 'startTime must align to 15-minute slots.' });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, isActive: true },
      select: { id: true, durationMinutes: true },
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found.' });
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (Number.isNaN(startDateTime.getTime())) {
      return reply.status(400).send({ error: 'Invalid startTime or date.' });
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + service.durationMinutes);

    const endMinutes = startMinutes + service.durationMinutes;
    const open = OPEN_MINUTES;
    const close = CLOSE_MINUTES;

    if (startMinutes < open || endMinutes > close) {
      return reply.status(400).send({ error: 'Appointment must be within business hours.' });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            status: { not: 'CANCELLED' },
            startTime: { lt: endDateTime },
            endTime: { gt: startDateTime },
          },
          select: { id: true },
        });

        if (conflict) {
          return null;
        }

        return tx.appointment.create({
          data: {
            userId: request.user!.userId,
            serviceId: service.id,
            startTime: startDateTime,
            endTime: endDateTime,
            status: 'CONFIRMED',
          },
          select: {
            id: true,
            serviceId: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        });
      });

      if (!created) {
        return reply.status(409).send({ error: 'Time slot unavailable.' });
      }

      return reply.status(201).send(created);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Unable to create appointment.' });
    }
  });

  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { me, status } = request.query as { me?: string; status?: string };

    if (me !== 'true') {
      return reply.status(400).send({ error: 'Query param me=true is required.' });
    }

    const where: {
      userId: string;
      status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    } = {
      userId: request.user!.userId,
    };

    if (status) {
      const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED'];
      if (!allowed.includes(status)) {
        return reply.status(400).send({ error: 'Invalid status filter.' });
      }
      where.status = status as 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        service: {
          select: { id: true, name: true, durationMinutes: true, priceCents: true },
        },
      },
    });

    const now = new Date();
    const upcoming: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      service: { id: string; name: string; durationMinutes: number; priceCents: number };
    }> = [];
    const past: typeof upcoming = [];

    for (const appt of appointments) {
      const item = {
        id: appt.id,
        date: formatDate(appt.startTime),
        startTime: formatTime(appt.startTime),
        endTime: formatTime(appt.endTime),
        status: appt.status,
        service: appt.service,
      };

      if (appt.endTime < now) {
        past.push(item);
      } else {
        upcoming.push(item);
      }
    }

    return { upcoming, past };
  });

  app.patch('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { action?: 'cancel' | 'reschedule'; date?: string; startTime?: string };

    if (!body.action) {
      return reply.status(400).send({ error: 'action is required.' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, userId: true, serviceId: true, status: true },
    });

    if (!appointment) {
      return reply.status(404).send({ error: 'Appointment not found.' });
    }

    if (appointment.userId !== request.user!.userId) {
      return reply.status(403).send({ error: 'Forbidden.' });
    }

    if (body.action === 'cancel') {
      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
        select: {
          id: true,
          serviceId: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      });

      return reply.send(updated);
    }

    if (body.action !== 'reschedule') {
      return reply.status(400).send({ error: 'Invalid action.' });
    }

    if (appointment.status === 'CANCELLED') {
      return reply.status(400).send({ error: 'Cancelled appointments cannot be rescheduled.' });
    }

    const { date, startTime } = body;
    if (!date || !startTime) {
      return reply.status(400).send({ error: 'date and startTime are required for reschedule.' });
    }

    if (!isValidDate(date) || !isValidTime(startTime)) {
      return reply.status(400).send({ error: 'Invalid date or time format.' });
    }

    const startMinutes = minutesSinceMidnight(startTime);
    if (startMinutes % SLOT_MINUTES !== 0) {
      return reply.status(400).send({ error: 'startTime must align to 15-minute slots.' });
    }

    const service = await prisma.service.findUnique({
      where: { id: appointment.serviceId },
      select: { durationMinutes: true },
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found.' });
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (Number.isNaN(startDateTime.getTime())) {
      return reply.status(400).send({ error: 'Invalid startTime or date.' });
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + service.durationMinutes);

    const endMinutes = startMinutes + service.durationMinutes;
    if (startMinutes < OPEN_MINUTES || endMinutes > CLOSE_MINUTES) {
      return reply.status(400).send({ error: 'Appointment must be within business hours.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          status: { not: 'CANCELLED' },
          startTime: { lt: endDateTime },
          endTime: { gt: startDateTime },
        },
        select: { id: true },
      });

      if (conflict) {
        return null;
      }

      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          startTime: startDateTime,
          endTime: endDateTime,
          status: 'CONFIRMED',
        },
        select: {
          id: true,
          serviceId: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      });
    });

    if (!updated) {
      return reply.status(409).send({ error: 'Time slot unavailable.' });
    }

    return reply.send(updated);
  });
}
