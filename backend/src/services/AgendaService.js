import { Agenda } from 'agenda';
import { Booking } from '../models/Booking.js';
import { Passenger } from '../models/Passenger.js';
import { NotificationService } from './NotificationService.js';
import { EmailService } from './EmailService.js';

let agendaInstance = null;

export const AgendaService = {
  getAgenda() {
    if (!agendaInstance) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error("MONGODB_URI environment variable is not defined");
      }
      agendaInstance = new Agenda({
        db: {
          address: uri,
          collection: 'agendaJobs'
        }
      });
      this.defineJobs();
    }
    return agendaInstance;
  },

  defineJobs() {
    const agenda = agendaInstance;

    // 24-hour reminder job
    agenda.define('send-24h-flight-reminder', async (job) => {
      const { bookingId } = job.attrs.data;
      console.log(`[Agenda] Running send-24h-flight-reminder for booking ${bookingId}`);

      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          console.warn(`[Agenda] Booking ${bookingId} not found, skipping 24h reminder`);
          return;
        }

        if (['cancelled', 'completed'].includes(booking.status)) {
          console.log(`[Agenda] Booking ${bookingId} status is ${booking.status}, skipping 24h reminder`);
          return;
        }

        // Create in-app notification
        await NotificationService.sendFlightReminder({ bookingId: booking._id });

        // Send email reminder
        const passenger = await Passenger.findById(booking.passengerId);
        if (passenger?.email) {
          const result = await EmailService.send24HourReminder({
            booking: booking.toObject(),
            passenger: { fullName: passenger.fullName, email: passenger.email },
          });
          console.log(`[Agenda] 24h email sent result for booking ${bookingId}:`, result);
        } else {
          console.warn(`[Agenda] Passenger email not found for booking ${bookingId}`);
        }
      } catch (err) {
        console.error(`[Agenda] Failed to send 24h reminder for booking ${bookingId}:`, err);
        throw err; // Agenda will mark job as failed and retry
      }
    });

    // 3-hour reminder job
    agenda.define('send-3h-flight-reminder', async (job) => {
      const { bookingId } = job.attrs.data;
      console.log(`[Agenda] Running send-3h-flight-reminder for booking ${bookingId}`);

      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          console.warn(`[Agenda] Booking ${bookingId} not found, skipping 3h reminder`);
          return;
        }

        if (['cancelled', 'completed'].includes(booking.status)) {
          console.log(`[Agenda] Booking ${bookingId} status is ${booking.status}, skipping 3h reminder`);
          return;
        }

        const passenger = await Passenger.findById(booking.passengerId);
        if (passenger?.email) {
          const result = await EmailService.send3HourReminder({
            booking: booking.toObject(),
            passenger: { fullName: passenger.fullName, email: passenger.email },
          });
          console.log(`[Agenda] 3h email sent result for booking ${bookingId}:`, result);
        } else {
          console.warn(`[Agenda] Passenger email not found for booking ${bookingId}`);
        }
      } catch (err) {
        console.error(`[Agenda] Failed to send 3h reminder for booking ${bookingId}:`, err.message);
        throw err; // Agenda will mark job as failed and retry
      }
    });
  },

  async start() {
    const agenda = this.getAgenda();
    await agenda.start();
    console.log('✅ [Agenda] Scheduler started successfully');
  },

  async scheduleReminders(booking) {
    const agenda = this.getAgenda();
    const bookingId = booking._id.toString();

    // Cancel existing reminder jobs for this booking to prevent duplicates on update
    await this.cancelReminders(booking._id);

    // If status is cancelled or completed, we do not reschedule reminders
    if (['cancelled', 'completed'].includes(booking.status)) {
      console.log(`[Agenda] Booking ${bookingId} is ${booking.status}. No reminders scheduled.`);
      return;
    }

    const departureTime = new Date(booking.departureDateTimeUtc).getTime();
    const now = Date.now();

    // 24 hours before departure
    const target24h = new Date(departureTime - 24 * 60 * 60 * 1000);
    if (target24h.getTime() > now) {
      console.log(`[Agenda] Scheduling 24h reminder for Booking ${bookingId} at ${target24h.toISOString()}`);
      await agenda.schedule(target24h, 'send-24h-flight-reminder', { bookingId: booking._id });
    } else {
      console.log(`[Agenda] 24h reminder window already passed for Booking ${bookingId}`);
    }

    // 3 hours before departure
    const target3h = new Date(departureTime - 3 * 60 * 60 * 1000);
    if (target3h.getTime() > now) {
      console.log(`[Agenda] Scheduling 3h reminder for Booking ${bookingId} at ${target3h.toISOString()}`);
      await agenda.schedule(target3h, 'send-3h-flight-reminder', { bookingId: booking._id });
    } else {
      console.log(`[Agenda] 3h reminder window already passed for Booking ${bookingId}`);
    }
  },

  async cancelReminders(bookingId) {
    const agenda = this.getAgenda();
    const result = await agenda.cancel({ 'data.bookingId': bookingId });
    if (result > 0) {
      console.log(`[Agenda] Cancelled ${result} pending reminder jobs for booking ${bookingId}`);
    }
  },

  /**
   * Scans future active bookings and schedules missing reminder jobs.
   * Self-healing migration for server restarts or new deployments.
   */
  async syncFutureBookingsJobs() {
    const agenda = this.getAgenda();
    const now = new Date();

    const futureBookings = await Booking.find({
      departureDateTimeUtc: { $gt: now },
      status: { $in: ['confirmed', 'updated'] }
    });

    console.log(`[Agenda] Syncing ${futureBookings.length} future active bookings...`);

    let scheduledCount = 0;
    for (const booking of futureBookings) {
      const jobs = await agenda.jobs({ 'data.bookingId': booking._id });
      if (jobs.length === 0) {
        await this.scheduleReminders(booking);
        scheduledCount++;
      }
    }

    if (scheduledCount > 0) {
      console.log(`[Agenda] Scheduled reminders for ${scheduledCount} previously un-scheduled future bookings.`);
    } else {
      console.log(`[Agenda] All future bookings are already scheduled.`);
    }
  }
};
