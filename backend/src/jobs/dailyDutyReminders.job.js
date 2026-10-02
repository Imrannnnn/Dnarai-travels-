import { User } from '../models/User.js';
import { Duty } from '../models/Duty.js';
import { DutyAssignment } from '../models/DutyAssignment.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { ScheduleService, formatDateYMD } from '../services/ScheduleService.js';
import { PushService } from '../services/PushService.js';
import { EmailService } from '../services/EmailService.js';

/**
 * Execute the twice-daily staff & admin duty operational briefing
 * @param {Object} options
 * @param {string} [options.slot] - 'morning' | 'afternoon'
 * @param {boolean} [options.force] - Bypass deduplication check for manual admin triggers
 */
export async function runDailyDutyRemindersJob({ slot, force = false } = {}) {
  const todayYmd = formatDateYMD(new Date());

  // Determine current briefing slot (Morning vs Afternoon)
  let currentSlot = slot;
  if (!currentSlot) {
    try {
      const lagosHour = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Lagos',
        hour: 'numeric',
        hour12: false,
      });
      currentSlot = Number(lagosHour) < 13 ? 'morning' : 'afternoon';
    } catch (_e) {
      const hour = new Date().getHours();
      currentSlot = hour < 13 ? 'morning' : 'afternoon';
    }
  }

  const slotTitle = currentSlot === 'morning' ? 'Morning Operations Briefing' : 'Afternoon Operations Review';
  console.log(`[dailyDutyReminders] Running ${slotTitle} for ${todayYmd}...`);

  // 1. Fetch On-Duty Staff for Today
  const onDutyStaff = await ScheduleService.getStaffOnDuty(todayYmd);

  // 2. Fetch Today's Flight Travels / Departures
  const startOfDay = new Date(`${todayYmd}T00:00:00.000Z`);
  const endOfDay = new Date(`${todayYmd}T23:59:59.999Z`);
  const travelsDocs = await Booking.find({
    departureDateTimeUtc: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: 'cancelled' },
  })
    .populate('passengerId', 'fullName email phone')
    .sort({ departureDateTimeUtc: 1 })
    .lean();

  const formattedTravels = travelsDocs.map((b) => ({
    flightNumber: b.flightNumber || 'FLT',
    airlineName: b.airlineName || 'Airline',
    route: `${b.origin?.city || b.origin?.iata || 'DEP'} → ${b.destination?.city || b.destination?.iata || 'ARR'}`,
    departureTime:
      b.departureTime24 ||
      (b.departureDateTimeUtc
        ? new Date(b.departureDateTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : '--:--'),
    passengerName: b.passengerId?.fullName || 'Valued Passenger',
  }));

  // 3. Fetch Today's Duties & Assignments
  const todayDuties = await Duty.find({ dueDate: todayYmd, status: { $ne: 'cancelled' } }).lean();
  const todayDutyIds = todayDuties.map((d) => d._id);
  const allTodayAssignments = await DutyAssignment.find({
    dutyId: { $in: todayDutyIds },
    status: { $ne: 'cancelled' },
  })
    .populate('dutyId')
    .populate('staffId', 'name email')
    .lean();

  // 4. Send Briefings to ON-DUTY STAFF
  let staffNotifiedCount = 0;
  for (const item of onDutyStaff) {
    if (!item.user) continue;
    const staffUser = item.user;
    const staffIdStr = String(staffUser._id);

    // Filter tasks assigned to this staff member
    const staffTasks = allTodayAssignments
      .filter((a) => String(a.staffId?._id || a.staffId) === staffIdStr)
      .map((a) => ({
        title: a.dutyId?.title || 'Operational Duty',
        priority: a.dutyId?.priority || 'medium',
        dueTime: a.dutyId?.dueTime || '17:00',
        status: a.status,
        notes: a.notes || '',
      }));

    const dedupeKey = `duty_briefing:${staffIdStr}:${todayYmd}:${currentSlot}`;

    // Deduplication check
    if (!force) {
      const existing = await Notification.findOne({ dedupeKey });
      if (existing) {
        console.log(`[dailyDutyReminders] Staff ${staffUser.email} already received ${currentSlot} briefing`);
        continue;
      }
    }

    try {
      // (a) Record in-app notification
      await Notification.create({
        recipientUserId: staffUser._id,
        type: 'duty_briefing',
        title: 'Duty Roster Briefing',
        message: `You are on duty today, stay active please. Shift: ${item.startTime || '08:00'} - ${item.endTime || '17:00'}. ${formattedTravels.length} flight departure(s) today.`,
        deliveryMethod: 'in_app',
        dedupeKey: force ? `${dedupeKey}:${Date.now()}` : dedupeKey,
      }).catch((err) => {
        if (err?.code !== 11000) console.error('[Notification] Error creating staff briefing notification:', err);
      });

      // (b) Web Push Notification to Staff
      await PushService.sendPushNotification(staffUser, {
        title: '✈️ You are on duty today, stay active please',
        body: `Shift: ${item.startTime || '08:00'} - ${item.endTime || '17:00'} | ${formattedTravels.length} flight(s) today | ${staffTasks.length} task(s) assigned`,
        url: '/staff-duties',
        type: 'duty_briefing',
      }).catch((err) => console.error(`[Push] Failed to send duty briefing push to ${staffUser.email}:`, err));

      // (c) Email Notification to Staff
      if (staffUser.email) {
        await EmailService.sendDailyStaffDutyBriefingEmail({
          email: staffUser.email,
          staffName: staffUser.name || staffUser.email.split('@')[0],
          shiftTitle: item.scheduleType?.replace('_', ' ')?.toUpperCase() || 'Duty Shift',
          shiftHours: `${item.startTime || '08:00'} - ${item.endTime || '17:00'}`,
          dateStr: todayYmd,
          slotName: slotTitle,
          travels: formattedTravels,
          tasks: staffTasks,
          portalUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/staff-duties`,
        }).catch((err) => console.error(`[Email] Failed to send briefing email to ${staffUser.email}:`, err));
      }

      staffNotifiedCount++;
    } catch (staffErr) {
      console.error(`[dailyDutyReminders] Error sending briefing to staff ${staffUser.email}:`, staffErr);
    }
  }

  // 5. Send Briefings to ADMINS
  const admins = await User.find({ role: 'admin' });
  const adminStaffSummary = onDutyStaff.map((s) => ({
    name: s.user.name || s.user.email.split('@')[0],
    email: s.user.email,
    hours: `${s.startTime || '08:00'} - ${s.endTime || '17:00'}`,
    type: s.scheduleType?.replace('_', ' ') || 'Active Shift',
  }));

  const pendingTasks = allTodayAssignments.filter((a) => a.status === 'pending');
  const staffNamesList = adminStaffSummary.map((s) => s.name).join(', ') || 'No staff on duty';

  let adminsNotifiedCount = 0;
  for (const admin of admins) {
    const adminDedupeKey = `admin_ops_briefing:${admin._id}:${todayYmd}:${currentSlot}`;

    if (!force) {
      const existing = await Notification.findOne({ dedupeKey: adminDedupeKey });
      if (existing) {
        console.log(`[dailyDutyReminders] Admin ${admin.email} already received ${currentSlot} briefing`);
        continue;
      }
    }

    try {
      // (a) Record in-app notification
      await Notification.create({
        recipientUserId: admin._id,
        type: 'duty_briefing',
        title: 'Daily Operations Briefing',
        message: `${onDutyStaff.length} staff on duty (${staffNamesList}). ${formattedTravels.length} flight(s) today. ${pendingTasks.length} pending task(s).`,
        deliveryMethod: 'in_app',
        isAdminOnly: true,
        dedupeKey: force ? `${adminDedupeKey}:${Date.now()}` : adminDedupeKey,
      }).catch((err) => {
        if (err?.code !== 11000) console.error('[Notification] Error creating admin briefing notification:', err);
      });

      // (b) Web Push Notification to Admin
      await PushService.sendPushNotification(admin, {
        title: `📋 Operations Briefing: ${onDutyStaff.length} Staff on Duty`,
        body: `On duty: ${staffNamesList} | ${formattedTravels.length} flight(s) | ${pendingTasks.length} pending task(s)`,
        url: '/super-admin?tab=duties',
        type: 'duty_briefing',
      }).catch((err) => console.error(`[Push] Failed to send operations push to admin ${admin.email}:`, err));

      // (c) Email Notification to Admin
      if (admin.email) {
        await EmailService.sendDailyAdminOperationsBriefingEmail({
          adminEmail: admin.email,
          adminName: admin.name || 'Administrator',
          dateStr: todayYmd,
          slotName: slotTitle,
          onDutyStaff: adminStaffSummary,
          travels: formattedTravels,
          pendingTasks,
          dashboardUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`,
        }).catch((err) => console.error(`[Email] Failed to send operations email to admin ${admin.email}:`, err));
      }

      adminsNotifiedCount++;
    } catch (adminErr) {
      console.error(`[dailyDutyReminders] Error sending operations briefing to admin ${admin.email}:`, adminErr);
    }
  }

  console.log(
    `✅ [dailyDutyReminders] ${slotTitle} complete. Staff notified: ${staffNotifiedCount}/${onDutyStaff.length}. Admins notified: ${adminsNotifiedCount}/${admins.length}.`
  );

  return {
    ok: true,
    slot: currentSlot,
    date: todayYmd,
    staffNotifiedCount,
    adminsNotifiedCount,
    onDutyStaffCount: onDutyStaff.length,
    travelsCount: formattedTravels.length,
    pendingTasksCount: pendingTasks.length,
  };
}
