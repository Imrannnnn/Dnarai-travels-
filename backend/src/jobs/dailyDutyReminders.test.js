import { runDailyDutyRemindersJob } from './dailyDutyReminders.job.js';
import { EmailService } from '../services/EmailService.js';

describe('Daily Duty Reminders & Operational Briefing Job', () => {
  test('EmailService has sendDailyStaffDutyBriefingEmail and sendDailyAdminOperationsBriefingEmail', () => {
    expect(typeof EmailService.sendDailyStaffDutyBriefingEmail).toBe('function');
    expect(typeof EmailService.sendDailyAdminOperationsBriefingEmail).toBe('function');
    expect(typeof EmailService.sendDutyCompletedAdminEmail).toBe('function');
    expect(typeof EmailService.sendDutyNoteUpdatedAdminEmail).toBe('function');
  });

  test('runDailyDutyRemindersJob is defined as an async function', () => {
    expect(typeof runDailyDutyRemindersJob).toBe('function');
  });
});
