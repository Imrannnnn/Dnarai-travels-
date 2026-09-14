import { z } from 'zod';

const fareGroupSchema = z.object({
  times: z.array(z.string()).or(z.string()).transform((val) => {
    if (Array.isArray(val)) return val;
    return String(val)
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }),
  baseFare: z.coerce.number().min(0),
  cardProcessingFee: z.coerce.number().min(0).optional(),
  totalFlightPrice: z.coerce.number().min(0).optional(),
});

const airlineOptionSchema = z.object({
  airlineName: z.string().min(1, 'Airline name is required'),
  fareGroups: z.array(fareGroupSchema).default([]),
});

export const createQuotationSchema = z.object({
  body: z.object({
    passengerId: z.string().optional().nullable(),
    clientName: z.string().min(1, 'Client name is required'),
    clientPhone: z.string().min(1, 'Client phone/WhatsApp number is required'),
    clientEmail: z.string().email().optional().or(z.literal('')).nullable(),
    tripType: z.enum(['one_way', 'return']).default('one_way'),
    passengerCount: z.coerce.number().int().min(1).default(1),
    originCity: z.string().min(1, 'Origin city is required'),
    originIata: z.string().optional().nullable(),
    destinationCity: z.string().min(1, 'Destination city is required'),
    destinationIata: z.string().optional().nullable(),
    departureDate: z.string().or(z.date()),
    returnDate: z.string().or(z.date()).optional().nullable(),
    outboundFlights: z.array(airlineOptionSchema).default([]),
    returnFlights: z.array(airlineOptionSchema).optional().default([]),
    cardProcessingFee: z.coerce.number().min(0).optional(),
    status: z.enum(['draft', 'sent', 'accepted', 'expired', 'cancelled']).optional().default('draft'),
    notes: z.string().optional().nullable(),
  }),
});

export const updateQuotationSchema = z.object({
  body: z.object({
    passengerId: z.string().optional().nullable(),
    clientName: z.string().min(1).optional(),
    clientPhone: z.string().min(1).optional(),
    clientEmail: z.string().email().optional().or(z.literal('')).nullable(),
    tripType: z.enum(['one_way', 'return']).optional(),
    passengerCount: z.coerce.number().int().min(1).optional(),
    originCity: z.string().min(1).optional(),
    originIata: z.string().optional().nullable(),
    destinationCity: z.string().min(1).optional(),
    destinationIata: z.string().optional().nullable(),
    departureDate: z.string().or(z.date()).optional(),
    returnDate: z.string().or(z.date()).optional().nullable(),
    outboundFlights: z.array(airlineOptionSchema).optional(),
    returnFlights: z.array(airlineOptionSchema).optional(),
    cardProcessingFee: z.coerce.number().min(0).optional(),
    status: z.enum(['draft', 'sent', 'accepted', 'expired', 'cancelled']).optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'sent', 'accepted', 'expired', 'cancelled']),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    cardProcessingFee: z.coerce.number().min(0).optional(),
    serviceChargeOneWay: z.coerce.number().min(0).optional(),
    serviceChargeReturn: z.coerce.number().min(0).optional(),
    disclaimerText: z.string().optional(),
    footerText: z.string().optional(),
  }),
});

export const previewMessageSchema = z.object({
  body: z.object({
    tripType: z.enum(['one_way', 'return']).default('one_way'),
    passengerCount: z.coerce.number().int().min(1).default(1),
    originCity: z.string().default('Departure'),
    destinationCity: z.string().default('Destination'),
    departureDate: z.string().or(z.date()).optional().nullable(),
    returnDate: z.string().or(z.date()).optional().nullable(),
    outboundFlights: z.array(airlineOptionSchema).default([]),
    returnFlights: z.array(airlineOptionSchema).optional().default([]),
    cardProcessingFee: z.coerce.number().min(0).optional(),
  }),
});
