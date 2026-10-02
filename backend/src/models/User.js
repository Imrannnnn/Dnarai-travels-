import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'agent', 'passenger', 'staff'], default: 'passenger' },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', index: true },
    mustChangePassword: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false },
    // Array of web push subscription objects from the client
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
    refreshTokens: { type: [String], default: [] },
    lastActivity: { type: Date, default: Date.now },
    name: { type: String, trim: true },
    color: { type: String, default: '#2563EB' },
  },
  { timestamps: true }
);

UserSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model('User', UserSchema);
