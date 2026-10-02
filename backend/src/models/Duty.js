import mongoose from 'mongoose';

const DutySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    dueTime: {
      type: String, // HH:mm (24h)
      default: '17:00',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'pending',
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ['on_duty', 'specific', 'all_on_duty'],
      default: 'on_duty',
    },
    sendPush: {
      type: Boolean,
      default: true,
    },
    sendEmail: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

DutySchema.index({ dueDate: 1, status: 1 });

export const Duty = mongoose.model('Duty', DutySchema);
