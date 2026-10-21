import mongoose from 'mongoose';
import { Duty } from '../models/Duty.js';
import { DutyAssignment } from '../models/DutyAssignment.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { Booking } from '../models/Booking.js';
import { PushService } from '../services/PushService.js';
import { EmailService } from '../services/EmailService.js';
import { ScheduleService, formatDateYMD } from '../services/ScheduleService.js';
import { runDailyDutyRemindersJob } from '../jobs/dailyDutyReminders.job.js';

/**
 * Check if a due date and time is past current server time
 */
function isOverdue(dueDate, dueTime = '23:59') {
  if (!dueDate) return false;
  try {
    const dueDateTime = new Date(`${dueDate}T${dueTime || '23:59'}:00`);
    return new Date() > dueDateTime;
  } catch (_e) {
    return false;
  }
}

/**
 * Background / on-demand checker for overdue duty assignments.
 * If deadline passed and not completed, notify admins with percentage done and incomplete items.
 */
export async function checkOverdueDutyChecklists() {
  try {
    const overdueAssignments = await DutyAssignment.find({
      status: { $in: ['pending', 'in_progress'] },
      overdueAlertSentAt: null,
    })
      .populate('dutyId')
      .populate('staffId', 'name email role');

    const admins = await User.find({ role: 'admin' });
    if (!admins || admins.length === 0) return { checked: 0, alerted: 0 };

    let alertedCount = 0;

    for (const assign of overdueAssignments) {
      const duty = assign.dutyId;
      if (!duty) continue;

      if (isOverdue(duty.dueDate, duty.dueTime)) {
        // Mark as overdue & record alert timestamp to prevent duplicate notifications
        assign.status = 'overdue';
        assign.overdueAlertSentAt = new Date();
        await assign.save();

        const staffName = assign.staffId?.name || assign.staffId?.email || 'Staff Member';
        const dutyTitle = duty.title;
        const totalCount = assign.checklist?.length || 0;
        const completedCount = assign.checklist?.filter((i) => i.completed).length || 0;
        const percentageDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : assign.percentageDone || 0;
        const incompleteItems = (assign.checklist || []).filter((i) => !i.completed).map((i) => i.text);

        for (const admin of admins) {
          try {
            // 1. In-App Notification
            await Notification.create({
              recipientUserId: admin._id,
              type: 'duty_overdue',
              title: '⚠️ Task Deadline Alert: Duty Incomplete',
              message: totalCount > 0
                ? `⚠️ ${staffName} reached deadline with ${percentageDone}% completed (${completedCount}/${totalCount} items) on "${dutyTitle}". Remaining: ${incompleteItems.slice(0, 3).join(', ')}${incompleteItems.length > 3 ? '...' : ''}`
                : `⚠️ ${staffName} did not complete duty "${dutyTitle}" before deadline (${duty.dueDate} at ${duty.dueTime}).`,
              deliveryMethod: 'in_app',
              isAdminOnly: true,
              relatedDutyId: duty._id,
              dedupeKey: `duty_overdue:${assign._id}:${admin._id}`,
            }).catch((err) => {
              if (err?.code !== 11000) console.error('[Notification] overdue alert err:', err);
            });

            // 2. Web Push Notification
            PushService.sendPushNotification(admin, {
              title: '⚠️ Task Deadline Missed',
              body: totalCount > 0
                ? `${staffName} reached deadline with ${percentageDone}% completed on "${dutyTitle}".`
                : `${staffName} missed deadline for "${dutyTitle}".`,
              url: '/super-admin?tab=duties',
              type: 'duty_overdue',
              dutyId: String(duty._id),
            }).catch((err) => console.error(`[Push] Overdue alert to ${admin.email} failed:`, err));

            // 3. Email Alert
            if (admin.email) {
              EmailService.sendDutyOverdueAdminEmail({
                adminEmail: admin.email,
                adminName: admin.name,
                staffName,
                dutyTitle,
                dueDate: duty.dueDate,
                dueTime: duty.dueTime,
                percentageDone,
                completedCount,
                totalCount,
                incompleteItems,
                dashboardUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`,
              }).catch((err) => console.error(`[Email] Overdue alert to ${admin.email} failed:`, err));
            }
          } catch (notifErr) {
            console.error(`[Duty] Failed sending overdue alert to admin ${admin._id}:`, notifErr);
          }
        }
        alertedCount++;
      }
    }

    return { checked: overdueAssignments.length, alerted: alertedCount };
  } catch (error) {
    console.error('[checkOverdueDutyChecklists] Error running overdue check:', error);
    return { error: error.message };
  }
}

export const dutyController = {
  /**
   * Create a new duty and resolve dynamic/manual assignments
   */
  async createDuty(req, res, next) {
    try {
      const {
        title,
        description,
        dueDate,
        dueTime = '17:00',
        priority = 'medium',
        assignmentType = 'on_duty',
        staffIds = [], // Array of User IDs
        sendPush = true,
        sendEmail = true,
        checklist = [],
      } = req.body;

      if (!title || !dueDate) {
        return res.status(400).json({ ok: false, message: 'Title and dueDate are required' });
      }

      // Normalize checklist items
      const normalizedChecklist = Array.isArray(checklist)
        ? checklist
            .map((item) => {
              if (typeof item === 'string') {
                const text = item.trim();
                return text ? { id: new mongoose.Types.ObjectId().toString(), text } : null;
              }
              if (item && typeof item === 'object') {
                const text = (item.text || '').trim();
                return text ? { id: item.id || new mongoose.Types.ObjectId().toString(), text } : null;
              }
              return null;
            })
            .filter(Boolean)
        : [];

      // 1. Create the primary Duty
      const duty = await Duty.create({
        title,
        description,
        dueDate,
        dueTime,
        priority,
        assignmentType,
        sendPush,
        sendEmail,
        createdBy: req.user.sub,
        status: 'pending',
        checklist: normalizedChecklist,
      });

      // 2. Resolve recipients
      let targetUserIds = [];
      let assignmentSource = 'MANUAL';

      if (assignmentType === 'specific') {
        targetUserIds = Array.isArray(staffIds) ? staffIds : [staffIds];
        assignmentSource = 'MANUAL';
      } else {
        // Dynamic assignment based on "who is on duty"
        assignmentSource = 'SCHEDULE';
        const onDutyStaff = await ScheduleService.getStaffOnDuty(dueDate);

        if (staffIds && staffIds.length > 0) {
          // Admin specifically selected a subset of on-duty staff
          targetUserIds = staffIds;
        } else {
          // Assign to all staff on duty for that date
          targetUserIds = onDutyStaff.map((item) => String(item.user._id));
        }
      }

      // Fallback: If no staff on duty found and no staffIds specified, duty is created unassigned or error
      if (!targetUserIds || targetUserIds.length === 0) {
        return res.status(201).json({
          ok: true,
          message: 'Duty created without assignments (no staff were scheduled on duty for this date)',
          duty,
          assignments: [],
        });
      }

      // 3. Create DutyAssignment records for each staff member
      const assignments = [];
      const assignedUsers = await User.find({ _id: { $in: targetUserIds } });

      for (const user of assignedUsers) {
        try {
          const assignment = await DutyAssignment.create({
            dutyId: duty._id,
            staffId: user._id,
            assignmentSource,
            status: 'pending',
            assignedAt: new Date(),
            checklist: normalizedChecklist.map((c) => ({
              id: c.id,
              text: c.text,
              completed: false,
              completedAt: null,
            })),
            percentageDone: 0,
          });
          assignments.push(assignment);

          // 4. In-App Notification Record
          await Notification.create({
            recipientUserId: user._id,
            type: 'duty_assigned',
            title: 'New Duty Assigned',
            message: `You have been assigned: ${duty.title} (Due: ${duty.dueDate} at ${duty.dueTime})`,
            deliveryMethod: 'in_app',
            relatedDutyId: duty._id,
            dedupeKey: `duty_assigned:${duty._id}:${user._id}`,
          }).catch((err) => {
            if (err?.code !== 11000) console.error('[Notification] Error creating in-app record:', err);
          });

          // 5. Dynamic Push Notification (Strictly to assigned staff member)
          if (sendPush) {
            PushService.sendPushNotification(user, {
              title: '📋 New Duty Assigned',
              body: `${duty.title} — Due ${duty.dueDate} at ${duty.dueTime}`,
              url: '/dashboard',
              type: 'duty_assigned',
              dutyId: String(duty._id),
            }).catch((err) => console.error(`[Push] Failed to push to staff ${user.email}:`, err));
          }

          // 6. Dynamic Email Notification (Strictly to assigned staff member)
          if (sendEmail && user.email) {
            EmailService.sendDutyAssignedEmail({
              email: user.email,
              staffName: user.name || user.email.split('@')[0],
              dutyTitle: duty.title,
              dutyDescription: duty.description,
              dueDate: duty.dueDate,
              dueTime: duty.dueTime,
              priority: duty.priority,
              loginUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/login`,
            }).catch((err) => console.error(`[Email] Failed to send duty email to ${user.email}:`, err));
          }
        } catch (assignErr) {
          console.error(`[Duty] Failed to assign staff ${user._id}:`, assignErr);
        }
      }

      // 7. Audit Log
      await AuditLog.create({
        actorUserId: req.user.sub,
        actorType: 'user',
        action: 'CREATE_DUTY',
        entityType: 'Duty',
        entityId: duty._id,
        diff: { title, dueDate, priority, assignmentType, targetUserIds },
      });

      res.status(201).json({
        ok: true,
        message: `Duty assigned to ${assignments.length} staff member(s)`,
        duty,
        assignments,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all duties with assignments and computed status (Admin view)
   */
  async getDuties(req, res, next) {
    try {
      // Trigger background check for overdue duty checklists
      checkOverdueDutyChecklists().catch((e) => console.error('[checkOverdueDutyChecklists]', e));

      const { status, staffId, priority, date } = req.query;
      const filter = {};

      if (priority) filter.priority = priority;
      if (date) filter.dueDate = date;

      const duties = await Duty.find(filter)
        .populate('createdBy', 'email name')
        .sort({ dueDate: -1, createdAt: -1 })
        .lean();

      // Retrieve all assignments for these duties
      const dutyIds = duties.map((d) => d._id);
      const assignmentQuery = { dutyId: { $in: dutyIds } };
      if (staffId) assignmentQuery.staffId = staffId;

      const allAssignments = await DutyAssignment.find(assignmentQuery)
        .populate('staffId', 'email role name color')
        .populate('completedBy', 'email name')
        .lean();

      // Group assignments by duty
      const assignmentsByDuty = {};
      for (const a of allAssignments) {
        const dId = String(a.dutyId);
        if (!assignmentsByDuty[dId]) assignmentsByDuty[dId] = [];
        
        // Dynamically compute overdue for assignment
        const effectiveStatus = (a.status === 'pending' && isOverdue(a.dutyId?.dueDate, a.dutyId?.dueTime))
          ? 'overdue'
          : a.status;

        assignmentsByDuty[dId].push({
          ...a,
          effectiveStatus,
        });
      }

      // Merge and compute overall status
      const result = duties.map((d) => {
        const dAssignments = assignmentsByDuty[String(d._id)] || [];
        
        // Compute overdue
        const overdue = d.status === 'pending' && isOverdue(d.dueDate, d.dueTime);
        const displayStatus = overdue ? 'overdue' : d.status;

        return {
          ...d,
          displayStatus,
          assignments: dAssignments,
        };
      });

      // Filter by status if requested
      const filtered = status
        ? result.filter((d) => d.displayStatus === status)
        : result;

      res.json({ ok: true, duties: filtered });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Staff Duty Dashboard: Get duties assigned to the authenticated staff member
   */
  async getMyDuties(req, res, next) {
    try {
      const staffId = req.user.sub;
      const todayYmd = formatDateYMD(new Date());

      // Query assignments for this staff member
      const assignments = await DutyAssignment.find({ staffId })
        .populate({
          path: 'dutyId',
          populate: { path: 'createdBy', select: 'name email' },
        })
        .sort({ createdAt: -1 })
        .lean();

      // Check if this staff member is currently on duty today
      const onDutyList = await ScheduleService.getStaffOnDuty(todayYmd);
      const isCurrentlyOnDuty = onDutyList.some((item) => String(item.user._id) === String(staffId));
      const todayScheduleInfo = onDutyList.find((item) => String(item.user._id) === String(staffId));

      // Query today's flight travels / departures
      const startOfDay = new Date(`${todayYmd}T00:00:00.000Z`);
      const endOfDay = new Date(`${todayYmd}T23:59:59.999Z`);
      const todayTravelsDocs = await Booking.find({
        departureDateTimeUtc: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      })
        .populate('passengerId', 'fullName email phone')
        .sort({ departureDateTimeUtc: 1 })
        .lean();

      const todayTravels = todayTravelsDocs.map((b) => ({
        _id: b._id,
        flightNumber: b.flightNumber || 'FLT',
        airlineName: b.airlineName || 'Airline',
        originCity: b.origin?.city || b.origin?.iata || 'DEP',
        originIata: b.origin?.iata || '',
        destCity: b.destination?.city || b.destination?.iata || 'ARR',
        destIata: b.destination?.iata || '',
        departureTime:
          b.departureTime24 ||
          (b.departureDateTimeUtc
            ? new Date(b.departureDateTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '--:--'),
        passengerName: b.passengerId?.fullName || 'Valued Passenger',
        status: b.status,
      }));

      // Annotate each assignment with effective status
      const formatted = assignments
        .filter((a) => a.dutyId) // Filter out deleted parent duties if any
        .map((a) => {
          const duty = a.dutyId;
          const overdue = a.status === 'pending' && isOverdue(duty.dueDate, duty.dueTime);
          return {
            ...a,
            effectiveStatus: overdue ? 'overdue' : a.status,
            isToday: duty.dueDate === todayYmd,
          };
        });

      res.json({
        ok: true,
        isCurrentlyOnDuty,
        todayScheduleInfo: todayScheduleInfo
          ? {
              scheduleType: todayScheduleInfo.scheduleType,
              startTime: todayScheduleInfo.startTime,
              endTime: todayScheduleInfo.endTime,
            }
          : null,
        todayTravels,
        assignments: formatted,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Mark individual duty assignment as completed
   */
  async completeDutyAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.sub;
      const userRole = req.user.role;

      const assignment = await DutyAssignment.findById(id).populate('dutyId');
      if (!assignment) {
        return res.status(404).json({ ok: false, message: 'Duty assignment not found' });
      }

      // Security check: Only the assigned staff member or an Admin can mark it completed
      if (String(assignment.staffId) !== String(userId) && userRole !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'Access denied: You are not authorized to complete this duty assignment',
        });
      }

      if (assignment.status === 'completed') {
        return res.status(400).json({ ok: false, message: 'Duty is already completed' });
      }

      if (assignment.status === 'cancelled') {
        return res.status(400).json({ ok: false, message: 'Duty has been cancelled' });
      }

      // Check if duty has checklist items and require 100% completion
      if (assignment.checklist && assignment.checklist.length > 0) {
        const incomplete = assignment.checklist.filter((item) => !item.completed);
        if (incomplete.length > 0) {
          return res.status(400).json({
            ok: false,
            message: `Cannot complete duty: ${incomplete.length} checklist item${incomplete.length > 1 ? 's' : ''} not yet completed. Please check off all items before finalizing.`,
            incompleteCount: incomplete.length,
            percentageDone: assignment.percentageDone,
          });
        }
      }

      const completedAt = new Date();

      // 1. Update DutyAssignment
      assignment.status = 'completed';
      assignment.percentageDone = 100;
      assignment.completedAt = completedAt;
      assignment.completedBy = userId;
      if (notes) assignment.notes = notes;
      await assignment.save();

      // 2. Check if all sibling assignments for this duty are completed
      const allSiblings = await DutyAssignment.find({ dutyId: assignment.dutyId._id });
      const allDone = allSiblings.every((s) => s.status === 'completed');
      if (allDone) {
        await Duty.findByIdAndUpdate(assignment.dutyId._id, {
          status: 'completed',
          completedAt,
          completedBy: userId,
        });
      }

      // 3. Admin Completion Notification
      // Retrieve completing staff information
      const staffUser = await User.findById(userId);
      const staffName = staffUser?.name || staffUser?.email || 'Staff Member';
      const dutyTitle = assignment.dutyId.title;
      const finalNotes = notes || assignment.notes || '';

      // Find all Admins
      const admins = await User.find({ role: 'admin' });

      for (const admin of admins) {
        try {
          // In-App Notification for Admin
          await Notification.create({
            recipientUserId: admin._id,
            type: 'duty_completed',
            title: 'Duty Completed',
            message: finalNotes
              ? `✓ ${staffName} completed: "${dutyTitle}" — Note: ${finalNotes}`
              : `✓ ${staffName} completed: "${dutyTitle}"`,
            deliveryMethod: 'in_app',
            isAdminOnly: true,
            relatedDutyId: assignment.dutyId._id,
            dedupeKey: `duty_completed:${assignment._id}:${Date.now()}`,
          });

          // Web Push to Admin
          PushService.sendPushNotification(admin, {
            title: '✅ Duty Completed',
            body: finalNotes
              ? `${staffName} completed "${dutyTitle}" — Note: ${finalNotes}`
              : `${staffName} completed "${dutyTitle}"`,
            url: '/super-admin?tab=duties',
            type: 'duty_completed',
            dutyId: String(assignment.dutyId._id),
          }).catch((err) => console.error(`[Push] Failed to alert admin ${admin.email}:`, err));

          // Email alert to Admin
          if (admin.email) {
            EmailService.sendDutyCompletedAdminEmail({
              adminEmail: admin.email,
              staffName,
              dutyTitle,
              completedAt,
              notes: finalNotes,
              dashboardUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`,
            }).catch((err) => console.error(`[Email] Failed to alert admin ${admin.email}:`, err));
          }
        } catch (notifyErr) {
          console.error(`[Duty] Failed to notify admin ${admin._id}:`, notifyErr);
        }
      }

      // 4. Audit Log
      await AuditLog.create({
        actorUserId: userId,
        actorType: 'user',
        action: 'COMPLETE_DUTY',
        entityType: 'DutyAssignment',
        entityId: assignment._id,
        diff: { status: 'completed', completedAt, notes: finalNotes },
      });

      res.json({
        ok: true,
        message: 'Duty marked as completed',
        assignment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add or update notes on a duty assignment (Staff or Admin)
   */
  async updateDutyAssignmentNotes(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.sub;
      const userRole = req.user.role;

      const assignment = await DutyAssignment.findById(id).populate('dutyId');
      if (!assignment) {
        return res.status(404).json({ ok: false, message: 'Duty assignment not found' });
      }

      // Security check: Only assigned staff member or admin can update notes
      if (String(assignment.staffId) !== String(userId) && userRole !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'Access denied: You are not authorized to update notes for this duty assignment',
        });
      }

      assignment.notes = notes || '';
      await assignment.save();

      // Retrieve author staff information
      const staffUser = await User.findById(userId);
      const staffName = staffUser?.name || staffUser?.email || 'Staff Member';
      const dutyTitle = assignment.dutyId?.title || 'Assigned Duty';
      const updatedAt = new Date();

      // Notify Admins about the updated note
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        try {
          await Notification.create({
            recipientUserId: admin._id,
            type: 'duty_note_updated',
            title: 'Duty Note Updated',
            message: `📝 ${staffName} on "${dutyTitle}": "${notes || 'Note cleared'}"`,
            deliveryMethod: 'in_app',
            isAdminOnly: true,
            relatedDutyId: assignment.dutyId?._id,
            dedupeKey: `duty_note_updated:${assignment._id}:${Date.now()}`,
          });

          PushService.sendPushNotification(admin, {
            title: '📝 Staff Task Note Updated',
            body: `${staffName} on "${dutyTitle}": "${(notes || '').slice(0, 100)}"`,
            url: '/super-admin?tab=duties',
            type: 'duty_note_updated',
            dutyId: String(assignment.dutyId?._id),
          }).catch((err) => console.error(`[Push] Failed to alert admin ${admin.email}:`, err));

          if (admin.email && notes) {
            EmailService.sendDutyNoteUpdatedAdminEmail({
              adminEmail: admin.email,
              staffName,
              dutyTitle,
              notes,
              updatedAt,
              dashboardUrl: `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`,
            }).catch((err) => console.error(`[Email] Failed to alert admin ${admin.email}:`, err));
          }
        } catch (notifyErr) {
          console.error(`[Duty] Failed to notify admin ${admin._id}:`, notifyErr);
        }
      }

      await AuditLog.create({
        actorUserId: userId,
        actorType: 'user',
        action: 'UPDATE_DUTY_NOTES',
        entityType: 'DutyAssignment',
        entityId: assignment._id,
        diff: { notes },
      });

      res.json({
        ok: true,
        message: 'Duty notes updated successfully',
        assignment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update checklist items on a duty assignment, recalculate percentage, and save
   */
  async updateDutyChecklist(req, res, next) {
    try {
      const { id } = req.params;
      const { checklist, itemId, completed } = req.body;
      const userId = req.user.sub;
      const userRole = req.user.role;

      const assignment = await DutyAssignment.findById(id).populate('dutyId');
      if (!assignment) {
        return res.status(404).json({ ok: false, message: 'Duty assignment not found' });
      }

      // Security check: Only assigned staff or admin can update checklist
      if (String(assignment.staffId) !== String(userId) && userRole !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'Access denied: You are not authorized to update this checklist',
        });
      }

      if (assignment.status === 'completed') {
        return res.status(400).json({ ok: false, message: 'Cannot update checklist of a completed duty' });
      }

      // Update specific item or whole checklist array
      if (itemId !== undefined && completed !== undefined) {
        const item = assignment.checklist.find(
          (i) => String(i.id) === String(itemId) || String(i._id) === String(itemId)
        );
        if (item) {
          item.completed = Boolean(completed);
          item.completedAt = completed ? new Date() : null;
        }
      } else if (Array.isArray(checklist)) {
        // Map from passed array
        const map = new Map(checklist.map((c) => [String(c.id || c._id), Boolean(c.completed)]));
        for (const item of assignment.checklist) {
          const key = String(item.id || item._id);
          if (map.has(key)) {
            const isComp = map.get(key);
            item.completed = isComp;
            item.completedAt = isComp ? (item.completedAt || new Date()) : null;
          }
        }
      }

      // Recalculate percentage
      const totalCount = assignment.checklist.length;
      const completedCount = assignment.checklist.filter((i) => i.completed).length;
      const percentageDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      assignment.percentageDone = percentageDone;

      if (percentageDone > 0 && assignment.status === 'pending') {
        assignment.status = 'in_progress';
      } else if (percentageDone === 0 && assignment.status === 'in_progress') {
        assignment.status = 'pending';
      }

      await assignment.save();

      // If duty was pending and now in_progress, reflect on parent Duty
      if (assignment.dutyId && assignment.dutyId.status === 'pending' && percentageDone > 0) {
        await Duty.findByIdAndUpdate(assignment.dutyId._id, { status: 'in_progress' });
      }

      // Audit log
      await AuditLog.create({
        actorUserId: userId,
        actorType: 'user',
        action: 'UPDATE_DUTY_CHECKLIST',
        entityType: 'DutyAssignment',
        entityId: assignment._id,
        diff: { percentageDone, completedCount, totalCount },
      }).catch((e) => console.error('[AuditLog] updateDutyChecklist error:', e));

      res.json({
        ok: true,
        message: 'Checklist updated successfully',
        assignment,
        percentageDone,
        completedCount,
        totalCount,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Admin-only manual trigger for the daily duty operational briefing
   */
  async triggerDailyBriefing(req, res, next) {
    try {
      const { slot } = req.body;
      const result = await runDailyDutyRemindersJob({ slot, force: true });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Cancel or delete a duty (Admin)
   */
  async deleteDuty(req, res, next) {
    try {
      const { id } = req.params;
      const duty = await Duty.findById(id);
      if (!duty) {
        return res.status(404).json({ ok: false, message: 'Duty not found' });
      }

      await Duty.findByIdAndDelete(id);
      await DutyAssignment.deleteMany({ dutyId: id });

      // Audit log
      await AuditLog.create({
        actorUserId: req.user.sub,
        actorType: 'user',
        action: 'DELETE_DUTY',
        entityType: 'Duty',
        entityId: id,
      });

      res.json({ ok: true, message: 'Duty and its assignments deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
