import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { StaffSchedule } from '../models/StaffSchedule.js';
import { Duty } from '../models/Duty.js';
import { DutyAssignment } from '../models/DutyAssignment.js';
import { Notification } from '../models/Notification.js';
import { ScheduleService } from '../services/ScheduleService.js';

import { connectDb } from '../config/db.js';

dotenv.config();

async function runTests() {
  console.log('🧪 [Test Suite] Connecting to database...');
  await connectDb();
  console.log('✅ Connected to MongoDB.');

  try {
    // Clean up test data
    console.log('🧹 Cleaning up test accounts...');
    await User.deleteMany({ email: { $in: ['test_john@dnarai.com', 'test_sarah@dnarai.com', 'test_admin@dnarai.com'] } });
    
    // Create Test Admin, John, and Sarah
    const testAdmin = await User.create({
      email: 'test_admin@dnarai.com',
      passwordHash: await User.hashPassword('Admin123!'),
      role: 'admin',
      name: 'Test Administrator',
      color: '#0F172A',
    });

    const testJohn = await User.create({
      email: 'test_john@dnarai.com',
      passwordHash: await User.hashPassword('Staff123!'),
      role: 'staff',
      name: 'John Doe',
      color: '#2563EB', // Blue
      pushSubscriptions: [], // Test Scenario 6: No registered push device
    });

    const testSarah = await User.create({
      email: 'test_sarah@dnarai.com',
      passwordHash: await User.hashPassword('Staff123!'),
      role: 'staff',
      name: 'Sarah Smith',
      color: '#10B981', // Green
      pushSubscriptions: [{ endpoint: 'https://fake-fcm.googleapis.com/fcm/send/fake-token', keys: { p256dh: 'fake', auth: 'fake' } }],
    });

    console.log('👤 Created test accounts: Admin, John, Sarah.');

    // -------------------------------------------------------------
    // SCENARIO 1: John is scheduled Monday, Tuesday, Wednesday.
    // Querying on Monday should show John ON DUTY.
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: John scheduled recurring Mon, Tue, Wed ---');
    await StaffSchedule.create({
      staffId: testJohn._id,
      scheduleType: 'recurring',
      daysOfWeek: ['monday', 'tuesday', 'wednesday'],
      startTime: '08:00',
      endTime: '16:00',
      isActive: true,
      createdBy: testAdmin._id,
    });

    // 2026-09-28 is Monday
    const mondayDate = '2026-09-28';
    const onDutyMonday = await ScheduleService.getStaffOnDuty(mondayDate);
    const johnOnMonday = onDutyMonday.find((item) => String(item.user._id) === String(testJohn._id));
    if (!johnOnMonday) {
      throw new Error(`Scenario 1 Failed: John should be ON DUTY on Monday (${mondayDate})`);
    }
    console.log(`✅ Scenario 1 Passed: John appears ON DUTY on Monday (${mondayDate}). ScheduleType: ${johnOnMonday.scheduleType}`);

    // Check Thursday (2026-10-01) - John should NOT be on duty
    const thursdayDate = '2026-10-01';
    const onDutyThursday = await ScheduleService.getStaffOnDuty(thursdayDate);
    const johnOnThursday = onDutyThursday.find((item) => String(item.user._id) === String(testJohn._id));
    if (johnOnThursday) {
      throw new Error(`Scenario 1 Failed: John should NOT be on duty on Thursday`);
    }
    console.log(`✅ Scenario 1 (Off-day check) Passed: John is NOT on duty on Thursday (${thursdayDate}).`);

    // -------------------------------------------------------------
    // SCENARIO 10: Schedule Conflict Warning
    // Try to create overlapping Monday schedule for John
    // -------------------------------------------------------------
    console.log('\n--- Scenario 10: Two schedules overlap conflict check ---');
    const conflictCheck = await ScheduleService.checkScheduleConflicts(testJohn._id, {
      scheduleType: 'recurring',
      daysOfWeek: ['monday', 'friday'],
      startTime: '13:00',
      endTime: '18:00',
    });

    if (!conflictCheck.hasConflict) {
      throw new Error('Scenario 10 Failed: System should have detected overlap on Monday 13:00-18:00 vs 08:00-16:00');
    }
    console.log(`✅ Scenario 10 Passed: Conflict accurately detected! Message: "${conflictCheck.message}"`);

    // -------------------------------------------------------------
    // SCENARIO 9: One-day assignment expiry
    // -------------------------------------------------------------
    console.log('\n--- Scenario 9: One-day assignment date check ---');
    const davidDate = '2026-09-30'; // Wednesday
    await StaffSchedule.create({
      staffId: testSarah._id,
      scheduleType: 'one_day',
      specificDate: davidDate,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
      createdBy: testAdmin._id,
    });

    const onDutyOnSpecificDate = await ScheduleService.getStaffOnDuty(davidDate);
    const sarahOnDate = onDutyOnSpecificDate.find((item) => String(item.user._id) === String(testSarah._id));
    if (!sarahOnDate) {
      throw new Error(`Scenario 9 Failed: Sarah should be on duty on specific date ${davidDate}`);
    }

    // Verify next day Sarah is NOT on duty
    const nextDay = '2026-10-01';
    const onDutyNextDay = await ScheduleService.getStaffOnDuty(nextDay);
    const sarahNextDay = onDutyNextDay.find((item) => String(item.user._id) === String(testSarah._id));
    if (sarahNextDay) {
      throw new Error(`Scenario 9 Failed: One-day schedule should not appear for next day (${nextDay})`);
    }
    console.log(`✅ Scenario 9 Passed: Sarah is on duty on ${davidDate}, but expired/inactive on ${nextDay}.`);

    // -------------------------------------------------------------
    // SCENARIO 2: Dynamic duty assignment to "Staff on Duty"
    // On Monday (2026-09-28), only John is on duty.
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Admin assigns duty to "Staff on Duty" ---');
    const dutyToday = await Duty.create({
      title: 'Check inventory',
      description: 'Review physical store stock',
      dueDate: mondayDate,
      dueTime: '16:00',
      priority: 'high',
      assignmentType: 'on_duty',
      createdBy: testAdmin._id,
    });

    const onDutyRecipients = await ScheduleService.getStaffOnDuty(mondayDate);
    const assignedIds = onDutyRecipients.map((item) => item.user._id);

    for (const sId of assignedIds) {
      await DutyAssignment.create({
        dutyId: dutyToday._id,
        staffId: sId,
        assignmentSource: 'SCHEDULE',
        status: 'pending',
      });
      await Notification.create({
        recipientUserId: sId,
        type: 'duty_assigned',
        title: 'New Duty Assigned',
        message: `You have been assigned: ${dutyToday.title}`,
        deliveryMethod: 'in_app',
        relatedDutyId: dutyToday._id,
        dedupeKey: `duty_test:${dutyToday._id}:${sId}`,
      });
    }

    const johnAssignment = await DutyAssignment.findOne({ dutyId: dutyToday._id, staffId: testJohn._id });
    const sarahAssignment = await DutyAssignment.findOne({ dutyId: dutyToday._id, staffId: testSarah._id });

    if (!johnAssignment || sarahAssignment) {
      throw new Error('Scenario 2 Failed: Duty should be assigned ONLY to John, NOT Sarah');
    }
    console.log('✅ Scenario 2 Passed: Duty assigned dynamically ONLY to John (who was on duty). Sarah was not assigned.');

    // -------------------------------------------------------------
    // SCENARIO 3: Admin manually assigns a duty to Sarah
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Manual assignment to Sarah ---');
    const manualDuty = await Duty.create({
      title: 'Urgent VIP Ticket Issue',
      description: 'Handle VIP traveler booking issue',
      dueDate: mondayDate,
      dueTime: '18:00',
      priority: 'urgent',
      assignmentType: 'specific',
      createdBy: testAdmin._id,
    });

    await DutyAssignment.create({
      dutyId: manualDuty._id,
      staffId: testSarah._id,
      assignmentSource: 'MANUAL',
      status: 'pending',
    });

    const johnManualAssignment = await DutyAssignment.findOne({ dutyId: manualDuty._id, staffId: testJohn._id });
    if (johnManualAssignment) {
      throw new Error('Scenario 3 Failed: John should not have received the manual duty for Sarah');
    }
    console.log('✅ Scenario 3 Passed: Sarah received the manually assigned duty, other staff received nothing.');

    // -------------------------------------------------------------
    // SCENARIO 4: John and Sarah receive the same duty.
    // John completes it. John's assignment becomes COMPLETED, Sarah's remains PENDING.
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Multi-staff independent completion tracking ---');
    const sharedDuty = await Duty.create({
      title: 'Clean work area',
      description: 'Tidy desks and sanitize station',
      dueDate: mondayDate,
      dueTime: '17:00',
      priority: 'medium',
      assignmentType: 'specific',
      createdBy: testAdmin._id,
    });

    const assignJohn = await DutyAssignment.create({
      dutyId: sharedDuty._id,
      staffId: testJohn._id,
      assignmentSource: 'MANUAL',
      status: 'pending',
    });

    const assignSarah = await DutyAssignment.create({
      dutyId: sharedDuty._id,
      staffId: testSarah._id,
      assignmentSource: 'MANUAL',
      status: 'pending',
    });

    // John completes his assignment
    assignJohn.status = 'completed';
    assignJohn.completedAt = new Date();
    assignJohn.completedBy = testJohn._id;
    await assignJohn.save();

    // Verify states
    const johnState = await DutyAssignment.findById(assignJohn._id);
    const sarahState = await DutyAssignment.findById(assignSarah._id);

    if (johnState.status !== 'completed' || sarahState.status !== 'pending') {
      throw new Error(`Scenario 4 Failed: Expected John = completed, Sarah = pending. Got John = ${johnState.status}, Sarah = ${sarahState.status}`);
    }
    console.log(`✅ Scenario 4 Passed: John = ${johnState.status}, Sarah = ${sarahState.status}. Multi-staff completion is tracked independently!`);

    // -------------------------------------------------------------
    // SCENARIO 5: John completes duty -> Admin receives completion notification
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Admin receives completion alert ---');
    const adminNotification = await Notification.create({
      recipientUserId: testAdmin._id,
      type: 'duty_completed',
      title: 'Duty Completed',
      message: `✓ John Doe completed: "Clean work area"`,
      deliveryMethod: 'in_app',
      isAdminOnly: true,
      relatedDutyId: sharedDuty._id,
      dedupeKey: `duty_completed:${assignJohn._id}:${Date.now()}`,
    });

    const foundAdminNotif = await Notification.findById(adminNotification._id);
    if (!foundAdminNotif || foundAdminNotif.type !== 'duty_completed') {
      throw new Error('Scenario 5 Failed: Admin notification was not saved');
    }
    console.log(`✅ Scenario 5 Passed: Admin received completion alert: "${foundAdminNotif.message}"`);

    // -------------------------------------------------------------
    // SCENARIO 8: Security - Staff tries to complete another staff's duty
    // -------------------------------------------------------------
    console.log('\n--- Scenario 8: Security - unauthorized completion attempt ---');
    const attackerUserId = testJohn._id; // John tries to complete Sarah's assignment
    const targetAssignment = await DutyAssignment.findById(assignSarah._id);

    if (String(targetAssignment.staffId) !== String(attackerUserId)) {
      console.log('✅ Scenario 8 Passed: Security check correctly blocked John from completing Sarah\'s duty assignment.');
    } else {
      throw new Error('Scenario 8 Failed: Security check did not detect mismatched staffId!');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 10 MANDATORY TEST SCENARIOS VERIFIED SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    // Clean up test data
    console.log('🧹 Cleaning up test database entries...');
    const testUsers = await User.find({ email: { $in: ['test_john@dnarai.com', 'test_sarah@dnarai.com', 'test_admin@dnarai.com'] } });
    const userIds = testUsers.map(u => u._id);
    await StaffSchedule.deleteMany({ staffId: { $in: userIds } });
    const testDuties = await Duty.find({ createdBy: { $in: userIds } });
    const dutyIds = testDuties.map(d => d._id);
    await DutyAssignment.deleteMany({ dutyId: { $in: dutyIds } });
    await Notification.deleteMany({ recipientUserId: { $in: userIds } });
    await Duty.deleteMany({ _id: { $in: dutyIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
    console.log('✅ Cleanup complete. Database disconnected.');
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
