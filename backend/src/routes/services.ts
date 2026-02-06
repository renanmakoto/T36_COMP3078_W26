import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

function toPublic(service: {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
}) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
  };
}

export async function servicesRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
    });

    return services.map(toPublic);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const service = await prisma.service.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found.' });
    }

    return toPublic(service);
  });
}
