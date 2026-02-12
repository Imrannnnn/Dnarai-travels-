import { Booking } from '../models/Booking.js';
import { Passenger } from '../models/Passenger.js';
import { NotificationService } from '../services/NotificationService.js';
import { EmailService } from '../services/EmailService.js';

export async function runFlightReminderJob() {
  const now = new Date();

  // 24-hour reminders (23.5 to 24.5 hours from now)
  const start24h = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const end24h = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  // 3-hour reminders (2.75 to 3.25 hours from now)
  const start3h = new Date(now.getTime() + 2.75 * 60 * 60 * 1000);
  const end3h = new Date(now.getTime() + 3.25 * 60 * 60 * 1000);

  // Find bookings for 24-hour reminders
  const bookings24h = await Booking.find({
    departureDateTimeUtc: { $gte: start24h, $lt: end24h },
    status: { $nin: ['cancelled', 'completed'] },
  }).limit(200);

  // Find bookings for 3-hour reminders
  const bookings3h = await Booking.find({
    departureDateTimeUtc: { $gte: start3h, $lt: end3h },
    status: { $nin: ['cancelled', 'completed'] },
  }).limit(200);

  // Send 24-hour reminders
  for (const booking of bookings24h) {
    try {
      // Create in-app notification
      await NotificationService.sendFlightReminder({ bookingId: booking._id });

      // Send email reminder
      const passenger = await Passenger.findById(booking.passengerId);
      if (passenger?.email) {
        await EmailService.send24HourReminder({
          booking: booking.toObject(),
          passenger: { fullName: passenger.fullName, email: passenger.email },
        });
      }
    } catch (err) {
      console.error(`Failed to send 24h reminder for booking ${booking._id}:`, err);
    }
  }

  // Send 3-hour reminders
  for (const booking of bookings3h) {
    try {
      const passenger = await Passenger.findById(booking.passengerId);
      if (passenger?.email) {
        await EmailService.send3HourReminder({
          booking: booking.toObject(),
          passenger: { fullName: passenger.fullName, email: passenger.email },
        });
      }
    } catch (err) {
      console.error(`Failed to send 3h reminder for booking ${booking._id}:`, err);
    }
  }

  if (bookings24h.length || bookings3h.length) {
    console.log(
      `[job] flight reminders processed: ${bookings24h.length} (24h), ${bookings3h.length} (3h)`
    );
  }
}
