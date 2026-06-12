import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    passengerId: z.string(),
    airlineName: z.string().min(2),
    flightNumber: z.string().min(2),
    origin: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    destination: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    bookingReference: z.string().optional(),
    ticketNumber: z.string().optional(),
    departureDateTimeUtc: z.string().datetime(),
    departureTime24: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  }),
});

export const updateBookingSchema = z.object({
  body: z.object({
    airlineName: z.string().min(2).optional(),
    flightNumber: z.string().min(2).optional(),
    departureDateTimeUtc: z.string().datetime().optional(),
    departureTime24: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    origin: z
      .object({
        city: z.string().min(2),
        iata: z.string().min(2),
        countryCode: z.string().optional(),
      })
      .optional(),
    destination: z
      .object({
        city: z.string().min(2),
        iata: z.string().min(2),
        countryCode: z.string().optional(),
      })
      .optional(),
    bookingReference: z.string().optional(),
    ticketNumber: z.string().optional(),
    status: z.enum(['confirmed', 'updated', 'cancelled', 'completed']).optional(),
  }),
  params: z.object({ id: z.string() }),
});

export const createReminderNoAccountSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    airlineName: z.string().min(2),
    flightNumber: z.string().min(2),
    origin: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    destination: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    bookingReference: z.string().optional(),
    ticketNumber: z.string().optional(),
    departureDateTimeUtc: z.string().datetime(),
    departureTime24: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  }),
});

