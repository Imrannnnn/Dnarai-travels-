import mongoose from 'mongoose';

const StaffScheduleSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduleType: {
      type: String,
      enum: ['recurring', 'part_time', 'one_day'],
      required: true,
      default: 'recurring',
      index: true,
    },
    // days of week in lowercase for recurring or part_time
    daysOfWeek: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: [],
    },
    // for one_day schedules: YYYY-MM-DD
    specificDate: {
      type: String,
      index: true,
    },
    // validity window for part_time or recurring if bounded
    startDate: {
      type: String, // YYYY-MM-DD
    },
    endDate: {
      type: String, // YYYY-MM-DD
    },
    startTime: {
      type: String,
      default: '08:00',
    },
    endTime: {
      type: String,
      default: '17:00',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

StaffScheduleSchema.index({ staffId: 1, scheduleType: 1, isActive: 1 });

export const StaffSchedule = mongoose.model('StaffSchedule', StaffScheduleSchema);
