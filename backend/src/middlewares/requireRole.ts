import type { FastifyReply, FastifyRequest } from 'fastify';

export function requireRole(roles: Array<'USER' | 'ADMIN'>) {
  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized.' });
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden.' });
    }
  };
}
