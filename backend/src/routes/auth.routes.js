import { Router } from 'express';
import { z } from 'zod';

import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/authJwt.js';
import { authController } from '../controllers/auth.controller.js';

/**
 * Authentication routes
 * Business logic is moved to auth.controller.js
 */
const router = Router();

// Validation schemas for authentication
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'agent', 'passenger', 'staff']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const resetFirstLoginSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

const addStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'staff', 'agent']),
    password: z.string().min(8).optional(),
  }),
});

const pushSubscriptionSchema = z.object({
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

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});

// Auth Route Handlers
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

router.post(
  '/reset-password-first-login',
  requireAuth,
  validate(resetFirstLoginSchema),
  authController.resetPasswordFirstLogin
);

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  authController.changePassword
);

router.post(
  '/add-staff',
  requireAuth,
  validate(addStaffSchema),
  authController.addStaff
);

router.post(
  '/web-push/subscribe',
  requireAuth,
  validate(pushSubscriptionSchema),
  authController.subscribePush
);

export default router;

