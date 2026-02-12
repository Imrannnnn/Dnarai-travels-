import { AuditLog } from '../models/AuditLog.js';

export const AuditService = {
  async log({ action, entityType, entityId, actorUserId, diff }) {
    await AuditLog.create({
      actorType: actorUserId ? 'user' : 'system',
      actorUserId: actorUserId || undefined,
      action,
      entityType,
      entityId,
      diff: diff || undefined,
    });
  },
};
