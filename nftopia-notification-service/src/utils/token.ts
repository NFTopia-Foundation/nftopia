import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function generateToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, SECRET);
}