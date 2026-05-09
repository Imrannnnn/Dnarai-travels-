import jwt from 'jsonwebtoken';

import { User } from '../models/User.js';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_UPDATE_INTERVAL_MS = 60 * 1000; // 1 minute to avoid DB spam

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next({ status: 401, code: 'UNAUTHORIZED', message: 'Missing Bearer token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    
    // Server-side Session / Idle Tracking
    const user = await User.findById(payload.sub);
    if (!user) {
      return next({ status: 401, code: 'UNAUTHORIZED', message: 'User not found' });
    }

    const now = Date.now();
    const lastActivityTime = user.lastActivity ? user.lastActivity.getTime() : now;

    if (now - lastActivityTime > IDLE_TIMEOUT_MS) {
      // User has been idle for too long, log them out server-side
      // Optionally clear refresh tokens here
      user.refreshTokens = [];
      await user.save();
      return next({ status: 401, code: 'SESSION_EXPIRED', message: 'Session expired due to inactivity' });
    }

    // Only update lastActivity if more than a minute has passed to reduce DB writes
    if (now - lastActivityTime > ACTIVITY_UPDATE_INTERVAL_MS) {
      user.lastActivity = new Date(now);
      await user.save();
    }

    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next({ status: 401, code: 'TOKEN_EXPIRED', message: 'Token expired' });
    }
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

export const requireAgency = requireRole(['admin', 'agent', 'staff']);
