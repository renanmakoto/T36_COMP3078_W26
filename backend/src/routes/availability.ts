import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

const SLOT_MINUTES = 15;
const OPEN_MINUTES = 10 * 60;
const CLOSE_MINUTES = 19 * 60;

function parseDateParam(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addMinutes(base: Date, minutes: number) {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function formatSlot(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function generateSlots(day: Date) {
  const slots: string[] = [];
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  let current = addMinutes(start, OPEN_MINUTES);
  const end = addMinutes(start, CLOSE_MINUTES);

  while (current <= addMinutes(end, -SLOT_MINUTES)) {
    slots.push(formatSlot(current));
    current = addMinutes(current, SLOT_MINUTES);
  }

  return slots;
}

function slotOverlaps(slotStart: Date, slotEnd: Date, apptStart: Date, apptEnd: Date) {
  return slotStart < apptEnd && slotEnd > apptStart;
}

export async function availabilityRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const { date } = request.query as { date?: string };
    if (!date) {
      return reply.status(400).send({ error: 'date is required (YYYY-MM-DD).' });
    }

    const parsed = parseDateParam(date);
    if (!parsed) {
      return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const dayStart = new Date(parsed);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    });

    const slots = generateSlots(parsed).filter((slot) => {
      const [h, m] = slot.split(':').map(Number);
      const slotStart = new Date(parsed);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = addMinutes(slotStart, SLOT_MINUTES);

      return !appointments.some((appt) => slotOverlaps(slotStart, slotEnd, appt.startTime, appt.endTime));
    });

    return { date, slots };
  });
}
