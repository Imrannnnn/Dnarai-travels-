import { z } from 'zod';

export const createPassengerAccountSchema = z.object({
  body: z.object({
    passengerId: z.string().min(1),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8),
  }),
});

export const onboardPassengerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email().toLowerCase(),
    phone: z.string().optional(),
  }),
});
