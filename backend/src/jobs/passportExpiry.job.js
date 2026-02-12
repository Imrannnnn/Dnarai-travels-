import { Passenger } from '../models/Passenger.js';
import { NotificationService } from '../services/NotificationService.js';

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export async function runPassportExpiryJob() {
  const now = new Date();

  const passengers = await Passenger.find({
    documentExpiryDate: { $ne: null },
  }).limit(500);

  for (const p of passengers) {
    if (!p.documentExpiryDate) continue;
    const monthsLeft = monthsBetween(now, p.documentExpiryDate);
    if (monthsLeft <= 6 && monthsLeft >= 0) {
      await NotificationService.notifyPassportExpiry({ passengerId: p._id, monthsLeft }).catch(
        () => null
      );
    }
  }

  console.log(`[job] passport expiry checked: ${passengers.length}`);
}
