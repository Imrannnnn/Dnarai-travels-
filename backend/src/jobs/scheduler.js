import cron from 'node-cron';
import { runPassportExpiryJob } from './passportExpiry.job.js';
import { runAutoCompleteFlightsJob } from './autoCompleteFlights.job.js';
import { runDailyDutyRemindersJob } from './dailyDutyReminders.job.js';

export function startSchedulers() {

  // Complete past flights: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runAutoCompleteFlightsJob().catch((e) => console.error('[job] autoCompleteFlights', e));
  });

  // Passport expiry: daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    await runPassportExpiryJob().catch((e) => console.error('[job] passportExpiry', e));
  });

  // Twice-daily Staff & Admin Duty Operational Briefings (08:00 WAT morning, 14:00 WAT afternoon)
  cron.schedule(
    '0 8,14 * * *',
    async () => {
      await runDailyDutyRemindersJob().catch((e) => console.error('[job] dailyDutyReminders', e));
    },
    { timezone: 'Africa/Lagos' }
  );

  console.log('[jobs] schedulers started (including twice-daily duty briefings at 08:00 & 14:00 WAT)');
}
