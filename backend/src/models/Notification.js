import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: false,
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
    relatedDutyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Duty', index: true },
    relatedScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffSchedule', index: true },

    title: { type: String },

    type: {
      type: String,
      enum: [
        'booking_created',
        'booking_request',
        'flight_reminder',
        'time_update',
        'passport_alert',
        'weather',
        'unrecognized_booking',
        'booking_alert',
        'duty_assigned',
        'duty_completed',
        'duty_overdue',
        'duty_briefing',
        'duty_note_updated',
        'schedule_assigned',
        'schedule_changed',
      ],
      required: true,
      index: true,
    },

    message: { type: String, required: true },

    deliveryMethod: { type: String, enum: ['email', 'in_app'], required: true },

    read: { type: Boolean, default: false, index: true },
    isAdminOnly: { type: Boolean, default: false, index: true },
    sentAt: { type: Date },

    dedupeKey: { type: String, required: true, index: true },
    meta: { type: Object },
  },
  { timestamps: true }
);

NotificationSchema.index({ passengerId: 1, dedupeKey: 1 }, { unique: true });

export const Notification = mongoose.model('Notification', NotificationSchema);
