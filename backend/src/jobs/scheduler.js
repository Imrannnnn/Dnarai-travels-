import cron from 'node-cron';
import { runFlightReminderJob } from './flightReminders.job.js';
import { runPassportExpiryJob } from './passportExpiry.job.js';
import { runAutoCompleteFlightsJob } from './autoCompleteFlights.job.js';

export function startSchedulers() {
  // Flight reminders: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runFlightReminderJob().catch((e) => console.error('[job] flightReminders', e));
  });

  // Complete past flights: hourly
  cron.schedule('0 * * * *', async () => {
    await runAutoCompleteFlightsJob().catch((e) => console.error('[job] autoCompleteFlights', e));
  });

  // Passport expiry: daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    await runPassportExpiryJob().catch((e) => console.error('[job] passportExpiry', e));
  });

  console.log('[jobs] schedulers started');
}
