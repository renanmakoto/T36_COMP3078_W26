import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyJwt } from '../utils/jwt';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized.' });
  }

  const token = auth.slice('Bearer '.length).trim();

  try {
    const payload = verifyJwt(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: 'Invalid token.' });
  }
}
