import { Booking } from '../models/Booking.js';
import { Passenger } from '../models/Passenger.js';
import { AuditService } from '../services/AuditService.js';
import { NotificationService } from '../services/NotificationService.js';
import { EmailService } from '../services/EmailService.js';

/**
 * Controller for handling flight bookings and schedule updates
 */
export const bookingsController = {
    /**
     * Fetches all bookings based on query filters
     */
    getAll: async (req, res, next) => {
        try {
            const { passengerId, status } = req.query;
            const q = {};
            if (passengerId) q.passengerId = passengerId;
            if (status) q.status = status;

            const bookings = await Booking.find(q)
                .sort({ departureDateTimeUtc: 1 })
                .limit(500);

            res.json(bookings);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Creates a new flight booking and notifies the passenger
     */
    create: async (req, res, next) => {
        try {
            const passenger = await Passenger.findById(req.validated.body.passengerId);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger not found'
                });
            }

            const booking = await Booking.create({
                ...req.validated.body,
                departureDateTimeUtc: new Date(req.validated.body.departureDateTimeUtc),
            });

            // Audit logging
            await AuditService.log({
                action: 'BOOKING_CREATED',
                entityType: 'Booking',
                entityId: booking._id,
                actorUserId: req.user?.sub,
            });

            // Trigger system notifications
            await NotificationService.notifyBookingCreated({ bookingId: booking._id });

            // Send immediate booking confirmation email
            try {
                await EmailService.sendBookingConfirmation({
                    booking: booking.toObject(),
                    passenger: { fullName: passenger.fullName, email: passenger.email },
                });
            } catch (emailErr) {
                console.error('Failed to send booking confirmation email:', emailErr);
            }

            res.status(201).json(booking);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Fetches a single booking details by ID
     */
    getById: async (req, res, next) => {
        try {
            const booking = await Booking.findById(req.params.id);
            if (!booking) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Booking not found'
                });
            }
            res.json(booking);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates an existing booking and handles change notifications
     */
    update: async (req, res, next) => {
        try {
            const booking = await Booking.findById(req.validated.params.id);
            if (!booking) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Booking not found'
                });
            }

            const oldDeparture = booking.departureDateTimeUtc?.toISOString();

            // Conditional updates based on provided fields
            if (req.validated.body.airlineName !== undefined)
                booking.airlineName = req.validated.body.airlineName;
            if (req.validated.body.flightNumber !== undefined)
                booking.flightNumber = req.validated.body.flightNumber;
            if (req.validated.body.departureTime24 !== undefined)
                booking.departureTime24 = req.validated.body.departureTime24;
            if (req.validated.body.origin !== undefined)
                booking.origin = req.validated.body.origin;
            if (req.validated.body.destination !== undefined)
                booking.destination = req.validated.body.destination;
            if (req.validated.body.bookingReference !== undefined)
                booking.bookingReference = req.validated.body.bookingReference;
            if (req.validated.body.ticketNumber !== undefined)
                booking.ticketNumber = req.validated.body.ticketNumber;

            if (req.validated.body.departureDateTimeUtc !== undefined) {
                booking.departureDateTimeUtc = new Date(req.validated.body.departureDateTimeUtc);
            }

            // Check for significant changes to trigger notifications
            const isChanged =
                JSON.stringify(oldDeparture) !==
                JSON.stringify(booking.departureDateTimeUtc?.toISOString()) ||
                req.validated.body.airlineName !== undefined ||
                req.validated.body.flightNumber !== undefined ||
                req.validated.body.origin !== undefined ||
                req.validated.body.destination !== undefined;

            const oldStatus = booking.status;
            if (req.validated.body.status !== undefined)
                booking.status = req.validated.body.status;

            const isStatusChangedToConfirmed = oldStatus !== 'confirmed' && booking.status === 'confirmed';

            await booking.save();

            // Log the update
            await AuditService.log({
                action: 'BOOKING_UPDATED',
                entityType: 'Booking',
                entityId: booking._id,
                actorUserId: req.user?.sub,
                diff: { oldDeparture, newDeparture: booking.departureDateTimeUtc?.toISOString() },
            });

            const passenger = await Passenger.findById(booking.passengerId);

            // Handle notifications based on change type
            if (isStatusChangedToConfirmed && passenger) {
                // Resend branded ticket on confirmation
                try {
                    await EmailService.sendBookingConfirmation({
                        booking: booking.toObject(),
                        passenger: { fullName: passenger.fullName, email: passenger.email },
                    });
                } catch (err) {
                    console.error('Failed to send status-change confirmation email:', err);
                }
            } else if (isChanged && passenger) {
                // Notify about schedule or flight changes
                await NotificationService.notifyFlightTimeUpdated({ bookingId: booking._id });

                try {
                    await EmailService.sendNotification({
                        passengerId: booking.passengerId,
                        type: 'flight_update',
                        message: `Your flight ${booking.flightNumber} details have been updated. Please check your dashboard for the latest schedule.`,
                        bookingId: booking._id,
                    });
                } catch (emailErr) {
                    console.error('Failed to send update notification email:', emailErr);
                }
            }

            res.json(booking);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Resends the flight reminder notification (Manual Trigger)
     */
    resendReminder: async (req, res, next) => {
        try {
            await NotificationService.sendFlightReminder({
                bookingId: req.params.id,
                force: true
            });
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    }
};
