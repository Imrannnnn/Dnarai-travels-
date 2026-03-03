import crypto from 'crypto';
import { Passenger } from '../models/Passenger.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { AuditService } from '../services/AuditService.js';
import { EmailService } from '../services/EmailService.js';

/**
 * Controller for passenger profile management and data lifecycle
 */
export const passengersController = {
    /**
     * Lists all passengers registered in the system (Agency Only)
     */
    getAll: async (req, res, next) => {
        try {
            const passengers = await Passenger.find()
                .sort({ createdAt: -1 })
                .limit(200);

            res.json(passengers.map((p) => p.toSafeJSON()));
        } catch (err) {
            next(err);
        }
    },

    /**
     * Creates a new passenger record and associated user account with temp password
     */
    create: async (req, res, next) => {
        try {
            const { email, fullName, phone } = req.validated.body;

            // 1. Create Passenger record
            const passenger = await Passenger.create({ fullName, email, phone });

            // 2. Create User account with a random temporary password
            const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // Example: 5A3F1B2C
            const passwordHash = await User.hashPassword(tempPassword);

            const user = await User.create({
                email: email.toLowerCase(),
                passwordHash,
                role: 'passenger',
                passengerId: passenger._id,
                mustChangePassword: true,
            });

            // 3. Send Welcome Email with onboarding details
            await EmailService.sendWelcomeEmail({
                email: user.email,
                fullName: passenger.fullName,
                password: tempPassword,
                loginUrl: process.env.CORS_ORIGIN || 'http://localhost:5173',
            });

            // Log the event
            await AuditService.log({
                action: 'PASSENGER_CREATED',
                entityType: 'Passenger',
                entityId: passenger._id,
                actorUserId: req.user?.sub,
            });

            res.status(201).json({
                ...passenger.toSafeJSON(),
                accountCreated: true,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Retrieves a single passenger profile by ID
     */
    getById: async (req, res, next) => {
        try {
            const passenger = await Passenger.findById(req.params.id);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger not found'
                });
            }
            res.json(passenger.toSafeJSON());
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates basic information on a passenger profile
     */
    update: async (req, res, next) => {
        try {
            const passenger = await Passenger.findById(req.validated.params.id);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger not found'
                });
            }

            const patch = req.validated.body;
            if (patch.fullName !== undefined) passenger.fullName = patch.fullName;
            if (patch.email !== undefined) passenger.email = patch.email;
            if (patch.phone !== undefined) passenger.phone = patch.phone;
            if (patch.documentType !== undefined) passenger.documentType = patch.documentType;

            if (patch.documentExpiryDate !== undefined) {
                passenger.documentExpiryDate = new Date(patch.documentExpiryDate);
            }

            await passenger.save();

            await AuditService.log({
                action: 'PASSENGER_UPDATED',
                entityType: 'Passenger',
                entityId: passenger._id,
                actorUserId: req.user?.sub,
            });

            res.json(passenger.toSafeJSON());
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates identification documents (Passport/ID Card) for a passenger
     */
    updateDocuments: async (req, res, next) => {
        try {
            const passenger = await Passenger.findById(req.validated.params.id);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger not found'
                });
            }

            const { documentNumber, documentExpiryDate, documentType } = req.validated.body;
            if (documentType) passenger.documentType = documentType;

            passenger.setDocumentNumber(documentNumber);
            passenger.documentExpiryDate = new Date(documentExpiryDate);

            await passenger.save();

            await AuditService.log({
                action: 'PASSENGER_DOCUMENT_UPDATED',
                entityType: 'Passenger',
                entityId: passenger._id,
                actorUserId: req.user?.sub,
            });

            res.json(passenger.toSafeJSON());
        } catch (err) {
            next(err);
        }
    },

    /**
     * Performs a cascade delete of a passenger and all associated bookings, notifications, and user account
     */
    delete: async (req, res, next) => {
        try {
            const passengerId = req.params.id;

            // 1. Delete the Passenger record
            const passenger = await Passenger.findByIdAndDelete(passengerId);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger not found'
                });
            }

            // 2. Cascade Delete User Account (Linked via passengerId or email)
            await User.deleteMany({
                $or: [{ passengerId: passengerId }, { email: passenger.email }],
            });

            // 3. Cascade Delete all Itineraries/Bookings
            await Booking.deleteMany({ passengerId });

            // 4. Cascade Delete all System Alerts/Notifications
            await Notification.deleteMany({ passengerId });

            await AuditService.log({
                action: 'PASSENGER_DELETED',
                entityType: 'Passenger',
                entityId: passengerId,
                actorUserId: req.user?.sub,
            });

            res.json({
                ok: true,
                message: 'Passenger and all associated data deleted successfully'
            });
        } catch (err) {
            next(err);
        }
    }
};
