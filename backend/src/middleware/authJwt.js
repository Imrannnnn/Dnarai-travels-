import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next({ status: 401, code: 'UNAUTHORIZED', message: 'Missing Bearer token' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return next({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}

export function requireRole(roles = []) {
  const allow = new Set(roles);
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role) return next({ status: 403, code: 'FORBIDDEN', message: 'Missing role' });
    if (!allow.has(role))
      return next({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' });
    return next();
  };
}

export const requireAgency = requireRole(['admin', 'agent']);
