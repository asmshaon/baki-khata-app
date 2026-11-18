import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './http-error.js';

export type TokenPayload =
  | { role: 'owner'; ownerId: number; shopId: number }
  | { role: 'customer'; customerId: number; shopId: number };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }
  return value;
}

export const hashPin = (pin: string) => bcrypt.hash(pin, 10);
export const checkPin = (pin: string, hash: string) => bcrypt.compare(pin, hash);

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: '90d' });
}

/** Requires a valid bearer token for the given role and attaches it to req.auth. */
export function requireRole(role: TokenPayload['role']) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new HttpError(401, 'loginAgain');
    }
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, secret()) as TokenPayload;
    } catch {
      throw new HttpError(401, 'loginAgain');
    }
    if (payload.role !== role) {
      throw new HttpError(403, 'forbidden');
    }
    req.auth = payload;
    next();
  };
}

export function ownerAuth(req: Request) {
  if (req.auth?.role !== 'owner') {
    throw new HttpError(401, 'loginAgain');
  }
  return req.auth;
}

export function customerAuth(req: Request) {
  if (req.auth?.role !== 'customer') {
    throw new HttpError(401, 'loginAgain');
  }
  return req.auth;
}
