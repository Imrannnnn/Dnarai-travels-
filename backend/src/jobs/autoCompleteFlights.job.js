import { Booking } from '../models/Booking.js';
import { AuditService } from '../services/AuditService.js';

export async function runAutoCompleteFlightsJob() {
    console.log('[job][autoComplete] Starting flight auto-completion check...');
    const now = new Date();

    try {
        const passedBookings = await Booking.find({
            departureDateTimeUtc: { $lt: now },
            status: { $in: ['confirmed', 'updated'] }
        });

        if (passedBookings.length === 0) {
            return;
        }

        console.log(`[job][autoComplete] Found ${passedBookings.length} flights that have passed. Updating to completed...`);

        const ids = passedBookings.map(b => b._id);
        await Booking.updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'completed' } }
        );

        // Optional: Log in audit
        await AuditService.log({
            action: 'SYSTEM_FLIGHT_AUTO_COMPLETED',
            entityType: 'Booking',
            entityId: 'system-batch',
            actorUserId: 'SYSTEM',
        });

    } catch (error) {
        console.error('[job][autoComplete] Error during flight auto-completion check:', error);
    }
}
