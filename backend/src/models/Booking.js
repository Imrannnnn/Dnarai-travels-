import mongoose from 'mongoose';

const PlaceSchema = new mongoose.Schema(
  {
    city: { type: String, required: true },
    iata: { type: String, required: true },
    countryCode: { type: String },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: true,
      index: true,
    },

    airlineName: { type: String, required: true },
    flightNumber: { type: String, required: true, index: true },

    origin: { type: PlaceSchema, required: true },
    destination: { type: PlaceSchema, required: true },

    departureDateTimeUtc: { type: Date, required: true, index: true },
    departureTime24: { type: String },

    status: {
      type: String,
      enum: ['confirmed', 'updated', 'cancelled', 'completed'],
      default: 'confirmed',
      index: true,
    },

    externalSource: {
      provider: { type: String, default: 'airline_web' },
      referenceId: { type: String },
    },

    bookingReference: { type: String }, // e.g. PNR
    ticketNumber: { type: String }, // e.g. 123-4567890123

    lastNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.post('save', async function (doc) {
  try {
    const { AgendaService } = await import('../services/AgendaService.js');
    await AgendaService.scheduleReminders(doc);
  } catch (err) {
    console.error(`[Mongoose Hook] Failed to schedule Agenda reminders for booking ${doc._id}:`, err);
  }
});

BookingSchema.post('remove', async function (doc) {
  try {
    const { AgendaService } = await import('../services/AgendaService.js');
    await AgendaService.cancelReminders(doc._id);
  } catch (err) {
    console.error(`[Mongoose Hook] Failed to cancel Agenda reminders for booking ${doc._id}:`, err);
  }
});

export const Booking = mongoose.model('Booking', BookingSchema);
