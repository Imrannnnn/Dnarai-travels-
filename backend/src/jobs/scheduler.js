import cron from 'node-cron';
import { runPassportExpiryJob } from './passportExpiry.job.js';
import { runAutoCompleteFlightsJob } from './autoCompleteFlights.job.js';

export function startSchedulers() {

  // Complete past flights: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runAutoCompleteFlightsJob().catch((e) => console.error('[job] autoCompleteFlights', e));
  });

  // Passport expiry: daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    await runPassportExpiryJob().catch((e) => console.error('[job] passportExpiry', e));
  });

  console.log('[jobs] schedulers started');
}
