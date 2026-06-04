import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'agent', 'passenger', 'staff']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const resetFirstLoginSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

export const addStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'staff', 'agent']),
    password: z.union([z.string().min(8), z.literal('')]).optional(),
  }),
});

export const pushSubscriptionSchema = z.object({
  body: z.object({
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string()
      })
    })
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});
