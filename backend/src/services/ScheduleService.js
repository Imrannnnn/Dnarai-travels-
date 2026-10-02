import { StaffSchedule } from '../models/StaffSchedule.js';
import { isSuperAdminUser } from '../utils/superAdmin.js';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateYMD(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get day of week in lowercase for a given YYYY-MM-DD string or Date
 */
export function getDayName(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00Z') : d;
  return DAYS_OF_WEEK[date.getUTCDay()];
}

/**
 * Check if two time intervals overlap (HH:mm format)
 */
function timeOverlaps(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) return true; // If times unspecified, assume full-day overlap
  return start1 < end2 && start2 < end1;
}

export const ScheduleService = {
  /**
   * Retrieves all staff members who are scheduled ON DUTY for a given date
   * @param {string|Date} dateParam - Target date (default today)
   * @returns {Promise<Array>} List of on-duty staff members with active schedule info
   */
  async getStaffOnDuty(dateParam = new Date()) {
    const targetYmd = typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatDateYMD(dateParam);

    const dayName = getDayName(targetYmd);

    // Find all active schedules
    const activeSchedules = await StaffSchedule.find({ isActive: true })
      .populate('staffId', 'email role name color pushSubscriptions')
      .lean();

    const onDutyStaffMap = new Map();

    for (const sched of activeSchedules) {
      if (!sched.staffId) continue;
      const staffUser = sched.staffId;
      if (isSuperAdminUser(staffUser)) continue;
      const staffIdStr = String(staffUser._id);

      let isOnDuty = false;

      if (sched.scheduleType === 'one_day') {
        // Must match specific date exactly
        if (sched.specificDate === targetYmd) {
          isOnDuty = true;
        }
      } else if (sched.scheduleType === 'recurring' || sched.scheduleType === 'part_time') {
        // Check day of week
        if (sched.daysOfWeek && sched.daysOfWeek.includes(dayName)) {
          // Check validity window if bounded
          const startValid = !sched.startDate || targetYmd >= sched.startDate;
          const endValid = !sched.endDate || targetYmd <= sched.endDate;
          if (startValid && endValid) {
            isOnDuty = true;
          }
        }
      }

      if (isOnDuty) {
        if (!onDutyStaffMap.has(staffIdStr)) {
          onDutyStaffMap.set(staffIdStr, {
            user: staffUser,
            schedules: [sched],
            scheduleType: sched.scheduleType,
            startTime: sched.startTime,
            endTime: sched.endTime,
          });
        } else {
          onDutyStaffMap.get(staffIdStr).schedules.push(sched);
        }
      }
    }

    return Array.from(onDutyStaffMap.values());
  },

  /**
   * Checks for schedule conflicts for a staff member
   * @param {string} staffId 
   * @param {Object} scheduleData 
   * @param {string} [excludeScheduleId] 
   */
  async checkScheduleConflicts(staffId, scheduleData, excludeScheduleId = null) {
    const query = {
      staffId,
      isActive: true,
    };
    if (excludeScheduleId) {
      query._id = { $ne: excludeScheduleId };
    }

    const existingSchedules = await StaffSchedule.find(query).lean();
    const conflicts = [];

    const { scheduleType, daysOfWeek = [], specificDate, startTime, endTime } = scheduleData;

    for (const existing of existingSchedules) {
      // Conflict checking for one-day vs one-day
      if (scheduleType === 'one_day' && existing.scheduleType === 'one_day') {
        if (specificDate && existing.specificDate === specificDate) {
          if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
            conflicts.push({
              existing,
              reason: `Already assigned to a specific schedule on ${specificDate} (${existing.startTime} - ${existing.endTime})`,
            });
          }
        }
      }
      // Conflict checking for one-day vs recurring/part-time on that day
      else if (scheduleType === 'one_day' && (existing.scheduleType === 'recurring' || existing.scheduleType === 'part_time')) {
        const targetDay = getDayName(specificDate);
        if (existing.daysOfWeek?.includes(targetDay)) {
          if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
            conflicts.push({
              existing,
              reason: `Staff already has a recurring schedule on ${targetDay} (${existing.startTime} - ${existing.endTime})`,
            });
          }
        }
      }
      // Conflict checking for recurring/part-time vs one-day
      else if ((scheduleType === 'recurring' || scheduleType === 'part_time') && existing.scheduleType === 'one_day') {
        const existingDay = getDayName(existing.specificDate);
        if (daysOfWeek.includes(existingDay)) {
          if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
            conflicts.push({
              existing,
              reason: `Staff has a specific date assignment on ${existing.specificDate} (${existingDay})`,
            });
          }
        }
      }
      // Conflict checking for recurring/part-time vs recurring/part-time
      else if (
        (scheduleType === 'recurring' || scheduleType === 'part_time') &&
        (existing.scheduleType === 'recurring' || existing.scheduleType === 'part_time')
      ) {
        const sharedDays = daysOfWeek.filter((day) => existing.daysOfWeek?.includes(day));
        if (sharedDays.length > 0) {
          if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
            conflicts.push({
              existing,
              reason: `Overlapping recurring days: ${sharedDays.join(', ')} (${existing.startTime} - ${existing.endTime})`,
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      message: conflicts.length > 0 ? conflicts.map((c) => c.reason).join('. ') : null,
    };
  },
};
