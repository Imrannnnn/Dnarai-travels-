import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/authJwt.js';
import { authController } from '../controllers/auth.controller.js';
import {
  registerSchema,
  loginSchema,
  resetFirstLoginSchema,
  changePasswordSchema,
  addStaffSchema,
  pushSubscriptionSchema,
  refreshTokenSchema
} from '../validators/auth.validator.js';

/**
 * Authentication routes
 * Business logic is moved to auth.controller.js
 */
const router = Router();

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

