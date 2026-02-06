import Fastify from 'fastify';
import prisma from './lib/prisma';
import { appointmentsRoutes } from './routes/appointments';
import { authRoutes } from './routes/auth';
import { availabilityRoutes } from './routes/availability';
import { servicesRoutes } from './routes/services';

const app = Fastify({ logger: true });

app.get('/health', async () => {
  let db: 'connected' | 'error' = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  return { status: 'ok', db };
});

app.register(authRoutes, { prefix: '/auth' });
app.register(servicesRoutes, { prefix: '/services' });
app.register(availabilityRoutes, { prefix: '/availability' });
app.register(appointmentsRoutes, { prefix: '/appointments' });

export default app;
