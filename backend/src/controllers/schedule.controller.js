import { StaffSchedule } from '../models/StaffSchedule.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { PushService } from '../services/PushService.js';
import { EmailService } from '../services/EmailService.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { isSuperAdminUser } from '../utils/superAdmin.js';

export const scheduleController = {
  /**
   * List all staff schedules (Admin/Super Admin)
   */
  async getSchedules(req, res, next) {
    try {
      const { staffId, scheduleType, isActive } = req.query;
      const filter = {};

      if (staffId) filter.staffId = staffId;
      if (scheduleType) filter.scheduleType = scheduleType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const schedules = await StaffSchedule.find(filter)
        .populate('staffId', 'email role name color isSuperAdmin')
        .populate('createdBy', 'email name')
        .sort({ createdAt: -1 })
        .lean();

      // Exclude schedules belonging to the Super Admin (regular admins and staff are kept)
      const visibleSchedules = schedules.filter((s) => {
        if (!s.staffId) return false;
        return !isSuperAdminUser(s.staffId);
      });

      res.json({ ok: true, schedules: visibleSchedules });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get staff members currently on duty for a specific date (default today)
   */
  async getOnDutyStaff(req, res, next) {
    try {
      const { date } = req.query;
      const onDuty = await ScheduleService.getStaffOnDuty(date || new Date());
      res.json({ ok: true, onDuty, queryDate: date || new Date().toISOString().slice(0, 10) });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new staff schedule with conflict detection, push & email alerts
   */
  async createSchedule(req, res, next) {
    try {
      const {
        staffId,
        scheduleType,
        daysOfWeek,
        specificDate,
        startDate,
        endDate,
        startTime,
        endTime,
        isActive = true,
        notes,
        overrideConflict = false,
        sendPush = true,
        sendEmail = true,
      } = req.body;

      if (!staffId || !scheduleType) {
        return res.status(400).json({ ok: false, message: 'staffId and scheduleType are required' });
      }

      const staffUser = await User.findById(staffId);
      if (!staffUser) {
        return res.status(404).json({ ok: false, message: 'Staff member not found' });
      }

      if (isSuperAdminUser(staffUser)) {
        return res.status(400).json({ ok: false, message: 'The Super Admin cannot be scheduled on the staff duty roster' });
      }

      // Check for conflicts
      const conflictCheck = await ScheduleService.checkScheduleConflicts(staffId, {
        scheduleType,
        daysOfWeek,
        specificDate,
        startTime: startTime || '08:00',
        endTime: endTime || '17:00',
      });

      if (conflictCheck.hasConflict && !overrideConflict) {
        return res.status(409).json({
          ok: false,
          conflict: true,
          message: `Schedule conflict detected: ${conflictCheck.message}`,
          conflicts: conflictCheck.conflicts,
        });
      }

      const schedule = await StaffSchedule.create({
        staffId,
        scheduleType,
        daysOfWeek: daysOfWeek || [],
        specificDate: specificDate || null,
        startDate: startDate || null,
        endDate: endDate || null,
        startTime: startTime || '08:00',
        endTime: endTime || '17:00',
        isActive,
        notes,
        createdBy: req.user.sub,
      });

      // Audit log
      await AuditLog.create({
        actorUserId: req.user.sub,
        actorType: 'user',
        action: 'CREATE_SCHEDULE',
        entityType: 'StaffSchedule',
        entityId: schedule._id,
        diff: { scheduleType, daysOfWeek, specificDate, staffId },
      });

      // Format schedule description label for notifications
      const scheduleLabel = scheduleType === 'one_day'
        ? `on ${specificDate} (${startTime || '08:00'} - ${endTime || '17:00'})`
        : daysOfWeek && daysOfWeek.length > 0
        ? `on ${daysOfWeek.map((d) => d.slice(0, 3).toUpperCase()).join(', ')} (${startTime || '08:00'} - ${endTime || '17:00'})`
        : `(${startTime || '08:00'} - ${endTime || '17:00'})`;

      // 1. In-App Notification Record
      await Notification.create({
        recipientUserId: staffUser._id,
        type: 'schedule_assigned',
        title: '📅 Duty Schedule Assigned',
        message: `You have been assigned to ${scheduleType.replace('_', ' ')} duty ${scheduleLabel}.`,
        deliveryMethod: 'in_app',
        relatedScheduleId: schedule._id,
        dedupeKey: `schedule_assigned:${schedule._id}:${staffUser._id}`,
      }).catch((err) => {
        if (err?.code !== 11000) console.error('[Notification] Error creating schedule record:', err);
      });

      // 2. Dynamic Web Push Notification
      if (sendPush) {
        PushService.sendPushNotification(staffUser, {
          title: '📅 Duty Schedule Assigned',
          body: `You are scheduled for duty ${scheduleLabel}. Tap to view roster.`,
          url: '/dashboard',
          type: 'schedule_assigned',
          scheduleId: String(schedule._id),
        }).catch((err) => console.error(`[Push] Failed to send schedule push to ${staffUser.email}:`, err));
      }

      // 3. Dynamic Email Notification
      if (sendEmail && staffUser.email) {
        EmailService.sendScheduleAssignedEmail({
          email: staffUser.email,
          staffName: staffUser.name || staffUser.email.split('@')[0],
          scheduleType,
          daysOfWeek,
          specificDate,
          startDate,
          endDate,
          startTime: startTime || '08:00',
          endTime: endTime || '17:00',
          notes,
          isReassigned: false,
          loginUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/login`,
        }).catch((err) => console.error(`[Email] Failed to send schedule email to ${staffUser.email}:`, err));
      }

      const populated = await StaffSchedule.findById(schedule._id)
        .populate('staffId', 'email role name color')
        .lean();

      res.status(201).json({
        ok: true,
        message: 'Staff schedule created successfully',
        schedule: populated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update or reassign an existing schedule with push & email alerts
   */
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const {
        staffId: newStaffId,
        scheduleType,
        daysOfWeek,
        specificDate,
        startDate,
        endDate,
        startTime,
        endTime,
        isActive,
        notes,
        overrideConflict = false,
        sendPush = true,
        sendEmail = true,
      } = req.body;

      const schedule = await StaffSchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({ ok: false, message: 'Schedule not found' });
      }

      const targetStaffId = newStaffId || schedule.staffId;
      const isStaffReassigned = newStaffId && String(newStaffId) !== String(schedule.staffId);
      const previousStaffId = schedule.staffId;

      if (newStaffId) {
        const targetUser = await User.findById(newStaffId);
        if (targetUser && isSuperAdminUser(targetUser)) {
          return res.status(400).json({ ok: false, message: 'Cannot assign schedule to Super Admin' });
        }
      }

      // Check conflict if staff, days, or times changed
      if (isStaffReassigned || daysOfWeek || specificDate || startTime || endTime) {
        const conflictCheck = await ScheduleService.checkScheduleConflicts(
          targetStaffId,
          {
            scheduleType: scheduleType || schedule.scheduleType,
            daysOfWeek: daysOfWeek !== undefined ? daysOfWeek : schedule.daysOfWeek,
            specificDate: specificDate !== undefined ? specificDate : schedule.specificDate,
            startTime: startTime || schedule.startTime,
            endTime: endTime || schedule.endTime,
          },
          id
        );

        if (conflictCheck.hasConflict && !overrideConflict) {
          return res.status(409).json({
            ok: false,
            conflict: true,
            message: `Schedule conflict detected: ${conflictCheck.message}`,
            conflicts: conflictCheck.conflicts,
          });
        }
      }

      if (newStaffId) schedule.staffId = newStaffId;
      if (scheduleType) schedule.scheduleType = scheduleType;
      if (daysOfWeek !== undefined) schedule.daysOfWeek = daysOfWeek;
      if (specificDate !== undefined) schedule.specificDate = specificDate;
      if (startDate !== undefined) schedule.startDate = startDate;
      if (endDate !== undefined) schedule.endDate = endDate;
      if (startTime !== undefined) schedule.startTime = startTime;
      if (endTime !== undefined) schedule.endTime = endTime;
      if (isActive !== undefined) schedule.isActive = isActive;
      if (notes !== undefined) schedule.notes = notes;
      schedule.updatedBy = req.user.sub;

      await schedule.save();

      // Audit log
      await AuditLog.create({
        actorUserId: req.user.sub,
        actorType: 'user',
        action: 'UPDATE_SCHEDULE',
        entityType: 'StaffSchedule',
        entityId: schedule._id,
        diff: req.body,
      });

      const scheduleLabel = schedule.scheduleType === 'one_day'
        ? `on ${schedule.specificDate} (${schedule.startTime} - ${schedule.endTime})`
        : schedule.daysOfWeek && schedule.daysOfWeek.length > 0
        ? `on ${schedule.daysOfWeek.map((d) => d.slice(0, 3).toUpperCase()).join(', ')} (${schedule.startTime} - ${schedule.endTime})`
        : `(${schedule.startTime} - ${schedule.endTime})`;

      // Notification Dispatch
      if (isStaffReassigned) {
        // Case A: Shift reassigned to a NEW staff member
        const newStaff = await User.findById(schedule.staffId);
        if (newStaff) {
          await Notification.create({
            recipientUserId: newStaff._id,
            type: 'schedule_assigned',
            title: '🔄 Duty Schedule Reassigned to You',
            message: `You have been reassigned to ${schedule.scheduleType.replace('_', ' ')} duty ${scheduleLabel}.`,
            deliveryMethod: 'in_app',
            relatedScheduleId: schedule._id,
            dedupeKey: `schedule_reassigned:${schedule._id}:${newStaff._id}:${Date.now()}`,
          }).catch((err) => console.error('[Notification] Error creating schedule record:', err));

          if (sendPush) {
            PushService.sendPushNotification(newStaff, {
              title: '🔄 Duty Schedule Reassigned',
              body: `You are now scheduled for duty ${scheduleLabel}.`,
              url: '/dashboard',
              type: 'schedule_assigned',
              scheduleId: String(schedule._id),
            }).catch((err) => console.error(`[Push] Failed to push to new staff:`, err));
          }

          if (sendEmail && newStaff.email) {
            EmailService.sendScheduleAssignedEmail({
              email: newStaff.email,
              staffName: newStaff.name || newStaff.email.split('@')[0],
              scheduleType: schedule.scheduleType,
              daysOfWeek: schedule.daysOfWeek,
              specificDate: schedule.specificDate,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              notes: schedule.notes,
              isReassigned: true,
              loginUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/login`,
            }).catch((err) => console.error(`[Email] Failed to send email to new staff:`, err));
          }
        }

        // Case B: Notify the previous staff member of the reassignment
        const prevStaff = await User.findById(previousStaffId);
        if (prevStaff) {
          await Notification.create({
            recipientUserId: prevStaff._id,
            type: 'schedule_changed',
            title: 'ℹ️ Duty Shift Reassigned',
            message: `Your duty shift ${scheduleLabel} has been reassigned to another staff member.`,
            deliveryMethod: 'in_app',
            relatedScheduleId: schedule._id,
            dedupeKey: `schedule_unassigned:${schedule._id}:${prevStaff._id}:${Date.now()}`,
          }).catch((err) => console.error('[Notification] Error creating schedule record:', err));

          if (sendPush) {
            PushService.sendPushNotification(prevStaff, {
              title: 'ℹ️ Shift Reassigned',
              body: `Your shift ${scheduleLabel} has been reassigned to another team member.`,
              url: '/dashboard',
              type: 'schedule_changed',
              scheduleId: String(schedule._id),
            }).catch((err) => console.error(`[Push] Failed to push to previous staff:`, err));
          }

          if (sendEmail && prevStaff.email) {
            EmailService.sendScheduleUnassignedEmail({
              email: prevStaff.email,
              staffName: prevStaff.name || prevStaff.email.split('@')[0],
              scheduleType: schedule.scheduleType,
              daysOfWeek: schedule.daysOfWeek,
              specificDate: schedule.specificDate,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            }).catch((err) => console.error(`[Email] Failed to send unassign email to previous staff:`, err));
          }
        }
      } else {
        // Case C: Schedule updated for the same staff member
        const staffUser = await User.findById(schedule.staffId);
        if (staffUser) {
          await Notification.create({
            recipientUserId: staffUser._id,
            type: 'schedule_changed',
            title: '🔄 Duty Schedule Updated',
            message: `Your duty schedule has been updated: ${scheduleLabel}.`,
            deliveryMethod: 'in_app',
            relatedScheduleId: schedule._id,
            dedupeKey: `schedule_updated:${schedule._id}:${Date.now()}`,
          }).catch((err) => console.error('[Notification] Error creating schedule record:', err));

          if (sendPush) {
            PushService.sendPushNotification(staffUser, {
              title: '🔄 Duty Schedule Updated',
              body: `Your duty schedule has been updated to ${scheduleLabel}.`,
              url: '/dashboard',
              type: 'schedule_changed',
              scheduleId: String(schedule._id),
            }).catch((err) => console.error(`[Push] Failed to push schedule update:`, err));
          }

          if (sendEmail && staffUser.email) {
            EmailService.sendScheduleAssignedEmail({
              email: staffUser.email,
              staffName: staffUser.name || staffUser.email.split('@')[0],
              scheduleType: schedule.scheduleType,
              daysOfWeek: schedule.daysOfWeek,
              specificDate: schedule.specificDate,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              notes: schedule.notes,
              isReassigned: true,
              loginUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/login`,
            }).catch((err) => console.error(`[Email] Failed to send schedule update email:`, err));
          }
        }
      }

      const updated = await StaffSchedule.findById(id)
        .populate('staffId', 'email role name color')
        .lean();

      res.json({ ok: true, message: 'Schedule updated successfully', schedule: updated });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a schedule and notify assigned staff
   */
  async deleteSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = await StaffSchedule.findById(id);
      if (!schedule) {
        return res.status(404).json({ ok: false, message: 'Schedule not found' });
      }

      // Notify staff member that schedule was removed
      if (schedule.staffId) {
        const staffUser = await User.findById(schedule.staffId);
        if (staffUser) {
          const scheduleLabel = schedule.scheduleType === 'one_day'
            ? `on ${schedule.specificDate} (${schedule.startTime} - ${schedule.endTime})`
            : schedule.daysOfWeek && schedule.daysOfWeek.length > 0
            ? `on ${schedule.daysOfWeek.map((d) => d.slice(0, 3).toUpperCase()).join(', ')} (${schedule.startTime} - ${schedule.endTime})`
            : `(${schedule.startTime} - ${schedule.endTime})`;

          await Notification.create({
            recipientUserId: staffUser._id,
            type: 'schedule_changed',
            title: 'ℹ️ Duty Schedule Removed',
            message: `Your duty schedule ${scheduleLabel} has been removed by management.`,
            deliveryMethod: 'in_app',
            dedupeKey: `schedule_deleted:${schedule._id}:${Date.now()}`,
          }).catch((err) => console.error('[Notification] Error creating schedule record:', err));

          PushService.sendPushNotification(staffUser, {
            title: 'ℹ️ Duty Schedule Removed',
            body: `Your duty schedule ${scheduleLabel} has been removed by management.`,
            url: '/dashboard',
            type: 'schedule_changed',
          }).catch((err) => console.error(`[Push] Failed to push delete notification:`, err));
        }
      }

      await StaffSchedule.findByIdAndDelete(id);

      // Audit log
      await AuditLog.create({
        actorUserId: req.user.sub,
        actorType: 'user',
        action: 'DELETE_SCHEDULE',
        entityType: 'StaffSchedule',
        entityId: id,
      });

      res.json({ ok: true, message: 'Schedule deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update staff custom display color
   */
  async updateStaffColor(req, res, next) {
    try {
      const { staffId } = req.params;
      const { color, name } = req.body;

      if (!color && !name) {
        return res.status(400).json({ ok: false, message: 'Color or name is required' });
      }

      const updates = {};
      if (color) updates.color = color;
      if (name) updates.name = name;

      const user = await User.findByIdAndUpdate(staffId, updates, { new: true })
        .select('_id email role name color');

      if (!user) {
        return res.status(404).json({ ok: false, message: 'Staff member not found' });
      }

      res.json({ ok: true, message: 'Staff profile updated successfully', user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get personal schedules for the logged in staff member
   */
  async getMySchedule(req, res, next) {
    try {
      const staffId = req.user.sub;
      const schedules = await StaffSchedule.find({ staffId, isActive: true })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ ok: true, schedules });
    } catch (err) {
      next(err);
    }
  },
};
