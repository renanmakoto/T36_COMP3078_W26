import jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
  role: 'USER' | 'ADMIN';
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret());
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret());
  return decoded as JwtPayload;
}
