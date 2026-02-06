import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { signJwt } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required.' });
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      return reply.status(201).send(user);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return reply.status(409).send({ error: 'User already exists.' });
      }
      throw err;
    }
  });

  app.post('/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, createdAt: true, passwordHash: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    const token = signJwt({ userId: user.id, role: user.role });
    const { passwordHash, ...safeUser } = user;
    return reply.send({ token, user: safeUser });
  });
}
