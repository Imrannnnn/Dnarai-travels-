import { User } from '../models/User.js';
import { Passenger } from '../models/Passenger.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';

/**
 * Controller for the Passenger Portal (B2C experience)
 */
export const portalController = {
    /**
     * Middleware to ensure user is a passenger and link their profile
     */
    portalMiddleware: async (req, res, next) => {
        try {
            const user = await User.findById(req.user?.sub);
            if (!user) {
                return next({
                    status: 401,
                    code: 'UNAUTHORIZED',
                    message: 'User not found'
                });
            }

            // Populate passengerId for downstream handlers
            if (user.passengerId) {
                req.passengerId = String(user.passengerId);
            }

            req.fullUser = user;
            return next();
        } catch (err) {
            next(err);
        }
    },

    /**
     * Updates or creates the passenger profile for the logged-in user
     */
    updateProfile: async (req, res, next) => {
        try {
            const { fullName, phone } = req.body;

            if (!fullName) {
                return next({
                    status: 400,
                    code: 'VALIDATION_ERROR',
                    message: 'Full name is required'
                });
            }

            let passenger;
            if (req.passengerId) {
                // Update existing profile
                passenger = await Passenger.findById(req.passengerId);
                if (!passenger) {
                    return next({
                        status: 404,
                        code: 'NOT_FOUND',
                        message: 'Passenger not found'
                    });
                }

                passenger.fullName = fullName;
                passenger.phone = phone || '';
                await passenger.save();
            } else {
                // Create new profile and link to User account
                passenger = await Passenger.create({
                    fullName,
                    email: req.fullUser?.email,
                    phone: phone || ''
                });

                req.fullUser.passengerId = passenger._id;
                await req.fullUser.save();
            }

            res.status(200).json({
                ok: true,
                message: 'Profile updated successfully',
                passenger: passenger.toSafeJSON()
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Retrieves the current user's passenger profile
     */
    getMe: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }
            const passenger = await Passenger.findById(req.passengerId);
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
     * Retrieves all bookings for the traveler, enriched with weather alerts
     */
    getBookings: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }

            const { WeatherService } = await import('../services/WeatherService.js');

            const bookings = await Booking.find({ passengerId: req.passengerId })
                .sort({ departureDateTimeUtc: 1 })
                .limit(500);

            // Enrich bookings with dynamic weather advice
            const data = await Promise.all(bookings.map(async (b) => {
                const bObj = b.toObject();
                try {
                    const weather = await WeatherService.getCityForecast({ city: b.destination?.city });
                    bObj.weather = weather;
                } catch (err) {
                    // Fallback static weather if service fails
                    bObj.weather = {
                        tempC: 22,
                        desc: 'Fair',
                        type: 'cloudSun',
                        advice: 'Standard travel attire is appropriate.'
                    };
                }
                return bObj;
            }));

            res.json(data);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Retrieves system alerts and notifications for the traveler
     */
    getNotifications: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }

            const q = {
                passengerId: req.passengerId,
                isAdminOnly: { $ne: true }
            };

            const items = await Notification.find(q)
                .sort({ createdAt: -1 })
                .limit(500);

            res.json(items);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Marks a specific portal notification as read
     */
    readNotification: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }

            const item = await Notification.findById(req.params.id);
            if (!item) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Notification not found'
                });
            }

            // Ownership check
            if (String(item.passengerId) !== String(req.passengerId)) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Ownership verification failed'
                });
            }

            item.read = true;
            item.sentAt = item.sentAt || new Date();
            await item.save();

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Marks all current traveler notifications as read
     */
    readAllNotifications: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }

            await Notification.updateMany(
                { passengerId: req.passengerId, read: false },
                { $set: { read: true } }
            );

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Submits a new booking request to the agency
     */
    submitBookingRequest: async (req, res, next) => {
        try {
            if (!req.passengerId) {
                return next({
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Passenger account not linked'
                });
            }

            const { departureCity, destination, date, notes, isReturn, returnDate, passengers } = req.body;

            if (!departureCity || !destination || !date) {
                return next({
                    status: 400,
                    code: 'VALIDATION_ERROR',
                    message: 'Itinerary basics (From, To, Date) are required'
                });
            }

            const passenger = await Passenger.findById(req.passengerId);
            if (!passenger) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Passenger record missing'
                });
            }

            const { EmailService } = await import('../services/EmailService.js');

            const requestDetails = {
                departureCity, destination, date, notes, isReturn, returnDate, passengers
            };

            // 1. Notify Agency Admins via Dedicated Email Service
            try {
                await EmailService.sendBookingRequestNotification({
                    adminEmail: process.env.EMAIL || process.env.BREVO_SMTP_USER,
                    passengerName: passenger.fullName,
                    passengerEmail: passenger.email,
                    passengerPhone: passenger.phone,
                    requestDetails
                });
            } catch (err) {
                console.error('Agency notification failure:', err);
            }

            // 2. Log In-App Notification for Passenger
            await Notification.create({
                passengerId: req.passengerId,
                type: 'booking_request',
                message: `Your request (${departureCity} ➝ ${destination}) has been submitted for review.`,
                deliveryMethod: 'in_app',
                dedupeKey: `req_pass_${req.passengerId}_${Date.now()}`,
            });

            // 3. Log System-Level Notification for Agency Dashboard
            await Notification.create({
                passengerId: req.passengerId,
                isAdminOnly: true,
                type: 'booking_request',
                message: `New Request: ${passenger.fullName} traveling ${departureCity} to ${destination}.`,
                meta: {
                    passenger: passenger.fullName,
                    email: passenger.email,
                    phone: passenger.phone,
                    wa_link: `https://wa.me/${(passenger.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello`,
                    requestDetails
                },
                deliveryMethod: 'in_app',
                dedupeKey: `req_admin_${req.passengerId}_${Date.now()}`,
            });

            res.status(201).json({
                ok: true,
                message: 'Booking request transmitted to agency'
            });
        } catch (err) {
            next(err);
        }
    }
};
