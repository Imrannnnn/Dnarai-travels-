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

    lastNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const Booking = mongoose.model('Booking', BookingSchema);
