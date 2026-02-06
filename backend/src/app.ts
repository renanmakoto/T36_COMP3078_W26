import Fastify from 'fastify';
import prisma from './lib/prisma';

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

export default app;
