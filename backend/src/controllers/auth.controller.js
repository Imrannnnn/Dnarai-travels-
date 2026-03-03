import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Controller for authentication and user management
 */
export const authController = {
    /**
     * Registers a new user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    register: async (req, res, next) => {
        try {
            // Data is already validated by Zod middleware
            const { email, password, role } = req.validated.body;

            // Check if user already exists
            const existing = await User.findOne({ email });
            if (existing) {
                return next({
                    status: 409,
                    code: 'EMAIL_TAKEN',
                    message: 'Email already in use'
                });
            }

            // Hash password and create user
            const passwordHash = await User.hashPassword(password);
            const user = await User.create({
                email,
                passwordHash,
                role: role || 'passenger'
            });

            res.json({ id: user._id, email: user.email, role: user.role });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Authenticates a user and returns a JWT
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    login: async (req, res, next) => {
        try {
            const { email, password } = req.validated.body;

            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return next({
                    status: 401,
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid credentials'
                });
            }

            // Verify password
            const ok = await user.verifyPassword(password);
            if (!ok) {
                return next({
                    status: 401,
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid credentials'
                });
            }

            // Sign JWT token
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
    },

    /**
     * Resets password on first login
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    resetPasswordFirstLogin: async (req, res, next) => {
        try {
            const { newPassword } = req.validated.body;
            const user = await User.findById(req.user.sub);

            if (!user) return next({ status: 404, message: 'User not found' });

            // Safety check: only allow if flag is set
            if (!user.mustChangePassword) {
                return next({
                    status: 400,
                    message: 'Password change not required or already completed'
                });
            }

            // Update password and clear flag
            user.passwordHash = await User.hashPassword(newPassword);
            user.mustChangePassword = false;
            await user.save();

            res.json({
                ok: true,
                message: 'Password updated successfully. You can now access your dashboard.'
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates user password
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    changePassword: async (req, res, next) => {
        try {
            const { currentPassword, newPassword } = req.validated.body;
            const userId = req.user.sub;

            const user = await User.findById(userId);
            if (!user) return next({ status: 404, message: 'User not found' });

            // Verify old password
            const ok = await user.verifyPassword(currentPassword);
            if (!ok) return next({ status: 400, message: 'Incorrect current password' });

            // Save new password
            user.passwordHash = await User.hashPassword(newPassword);
            await user.save();

            res.json({ ok: true, message: 'Password changed successfully' });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Adds a new staff member (Admin only)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    addStaff: async (req, res, next) => {
        try {
            // Role check (can also be moved to specialized middleware if preferred)
            if (req.user.role !== 'admin') {
                return next({ status: 403, message: 'Only admins can add staff' });
            }

            const { email, role, password } = req.validated.body;

            // Check if user already exists
            const existing = await User.findOne({ email });
            if (existing) {
                return next({ status: 409, message: 'User already exists' });
            }

            // Generate random password if not provided
            const tempPassword = password || Math.random().toString(36).slice(-8) + 'Aa1!';
            const passwordHash = await User.hashPassword(tempPassword);

            // Create staff user with "must change password" flag
            const user = await User.create({
                email,
                passwordHash,
                role,
                mustChangePassword: true,
            });

            res.json({
                ok: true,
                message: 'Staff account created successfully',
                tempPassword, // Return temporary password to admin
                user: { id: user._id, email: user.email, role: user.role }
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Subscribes a user to web push notifications
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    subscribePush: async (req, res, next) => {
        try {
            const user = await User.findById(req.user.sub);
            if (!user) return next({ status: 404, message: 'User not found' });

            const { subscription } = req.validated.body;

            // Prevent duplicate subscriptions
            const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
            if (!exists) {
                user.pushSubscriptions.push(subscription);
                await user.save();
            }

            res.json({ ok: true, message: 'Subscribed to push notifications' });
        } catch (err) {
            next(err);
        }
    }
};
