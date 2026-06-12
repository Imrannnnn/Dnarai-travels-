import { z } from 'zod';

export const createPassengerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email().toLowerCase(),
    phone: z.string().optional(),
  }),
});

export const updatePassengerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().optional(),
    documentType: z.enum(['passport', 'international_card']).optional(),
    documentExpiryDate: z.string().datetime().optional(),
  }),
  params: z.object({ id: z.string() }),
});

export const setPassengerDocSchema = z.object({
  body: z.object({
    documentNumber: z.string().min(4),
    documentExpiryDate: z.string().datetime(),
    documentType: z.enum(['passport', 'international_card']).optional(),
  }),
  params: z.object({ id: z.string() }),
});
