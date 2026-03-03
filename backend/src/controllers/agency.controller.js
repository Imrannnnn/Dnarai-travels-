import { Passenger } from '../models/Passenger.js';
import { User } from '../models/User.js';

/**
 * Controller for agency operations
 */
export const agencyController = {
    /**
     * Creates a passenger user account linked to a Passenger record
     */
    createPassengerAccount: async (req, res, next) => {
        try {
            const { passengerId, email, password } = req.validated.body;

            // Check if passenger exists
            const passenger = await Passenger.findById(passengerId);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'PASSENGER_NOT_FOUND',
                    message: 'Passenger not found'
                });
            }

            // Check if email is already taken
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return next({
                    status: 409,
                    code: 'EMAIL_TAKEN',
                    message: 'Email already in use'
                });
            }

            // Check if passenger already has a linked account
            const existingLink = await User.findOne({ passengerId });
            if (existingLink) {
                return next({
                    status: 409,
                    code: 'PASSENGER_ALREADY_LINKED',
                    message: 'Passenger already has a user account',
                });
            }

            // Hash password and create user
            const passwordHash = await User.hashPassword(password);
            const user = await User.create({
                email,
                passwordHash,
                role: 'passenger',
                passengerId
            });

            res.json({
                id: user._id,
                email: user.email,
                role: user.role,
                passengerId: user.passengerId
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Onboards a new passenger (Creates Passenger + User + sends Welcome Email)
     */
    onboardPassenger: async (req, res, next) => {
        try {
            const { fullName, email, phone } = req.validated.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return next({
                    status: 409,
                    code: 'EMAIL_TAKEN',
                    message: 'Email already in use'
                });
            }

            // 1. Create Passenger record
            const passenger = await Passenger.create({ fullName, email, phone });

            // 2. Generate Random Temporary Password
            const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
            const passwordHash = await User.hashPassword(tempPassword);

            // 3. Create linked User Account
            const user = await User.create({
                email,
                passwordHash,
                role: 'passenger',
                passengerId: passenger._id,
                mustChangePassword: true // Typically expected for agency-created accounts
            });

            // 4. Send Welcome Email
            const loginUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
            try {
                const { EmailService } = await import('../services/EmailService.js');
                const emailResult = await EmailService.sendWelcomeEmail({
                    email,
                    fullName,
                    password: tempPassword,
                    loginUrl,
                });

                if (emailResult?.ok) {
                    console.log(`✅ Welcome email sent successfully to ${email}`);
                } else {
                    console.error(
                        `❌ Welcome email failed to send to ${email}:`,
                        emailResult?.error || 'Unknown error'
                    );
                }
            } catch (emailErr) {
                console.error('⚠️ Welcome email execution error:', emailErr);
            }

            res.json({
                passenger: passenger.toSafeJSON(),
                userId: user._id,
                tempPassword,
            });
        } catch (err) {
            next(err);
        }
    }
};
