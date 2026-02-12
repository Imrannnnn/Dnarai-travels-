import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { validate } from '../middleware/validate.js';
import { User } from '../models/User.js';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'agent', 'passenger', 'staff']).optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});


router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, role } = req.validated.body;

    const existing = await User.findOne({ email });
    if (existing)
      return next({ status: 409, code: 'EMAIL_TAKEN', message: 'Email already in use' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email, passwordHash, role: role || 'passenger' });

    res.json({ id: user._id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;

    const user = await User.findOne({ email });
    if (!user)
      return next({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    const ok = await user.verifyPassword(password);
    if (!ok)
      return next({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: String(user._id), role: user.role, email: user.email },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    res.json({
      accessToken: token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    next(err);
  }
});

const resetFirstLoginSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8),
  }),
});

router.post(
  '/reset-password-first-login',
  requireAuth,
  validate(resetFirstLoginSchema),
  async (req, res, next) => {
    try {
      const { newPassword } = req.validated.body;
      const user = await User.findById(req.user.sub);

      if (!user) return next({ status: 404, message: 'User not found' });
      if (!user.mustChangePassword) {
        return next({ status: 400, message: 'Password change not required or already completed' });
      }

      user.passwordHash = await User.hashPassword(newPassword);
      user.mustChangePassword = false; // Clear the flag
      await user.save();

      res.json({ ok: true, message: 'Password updated successfully. You can now access your dashboard.' });
    } catch (err) {
      next(err);
    }
  }
);

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

import { requireAuth } from '../middleware/authJwt.js';

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.validated.body;
      const userId = req.user.sub;

      const user = await User.findById(userId);
      if (!user) return next({ status: 404, message: 'User not found' });

      const ok = await user.verifyPassword(currentPassword);
      if (!ok) return next({ status: 400, message: 'Incorrect current password' });

      user.passwordHash = await User.hashPassword(newPassword);
      await user.save();

      res.json({ ok: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }

);

const addStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'staff', 'agent']),
    password: z.string().min(8).optional(),
  }),
});

router.post(
  '/add-staff',
  requireAuth,
  validate(addStaffSchema),
  async (req, res, next) => {
    try {
      // Only admins can add staff
      if (req.user.role !== 'admin') {
        return next({ status: 403, message: 'Only admins can add staff' });
      }

      const { email, role, password } = req.validated.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return next({ status: 409, message: 'User already exists' });
      }

      // Generate random password if not provided
      const tempPassword = password || Math.random().toString(36).slice(-8) + 'Aa1!';
      const passwordHash = await User.hashPassword(tempPassword);

      const user = await User.create({
        email,
        passwordHash,
        role,
        mustChangePassword: true,
      });

      // In production, send email. For now return the password.
      res.json({
        ok: true,
        message: 'Staff account created successfully',
        tempPassword, // Provide this to the admin to give to the user
        user: { id: user._id, email: user.email, role: user.role }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
