import mongoose from 'mongoose';

const DutyAssignmentSchema = new mongoose.Schema(
  {
    dutyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Duty',
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignmentSource: {
      type: String,
      enum: ['SCHEDULE', 'MANUAL'],
      default: 'SCHEDULE',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'pending',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

DutyAssignmentSchema.index({ dutyId: 1, staffId: 1 }, { unique: true });
DutyAssignmentSchema.index({ staffId: 1, status: 1 });

export const DutyAssignment = mongoose.model('DutyAssignment', DutyAssignmentSchema);
