import mongoose from 'mongoose';
import { encryptSensitive, maskLast4 } from '../utils/crypto.js';

const PassengerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String },

    documentType: { type: String, enum: ['passport', 'international_card'], default: 'passport' },
    documentNumberEnc: { type: String },
    documentNumberLast4: { type: String },
    documentExpiryDate: { type: Date },
  },
  { timestamps: true }
);

PassengerSchema.methods.setDocumentNumber = function (plainNumber) {
  const raw = String(plainNumber);
  this.documentNumberEnc = encryptSensitive(raw);
  this.documentNumberLast4 = raw.slice(-4);
};

PassengerSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    documentType: this.documentType,
    documentNumberMasked: maskLast4(this.documentNumberLast4),
    documentExpiryDate: this.documentExpiryDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Passenger = mongoose.model('Passenger', PassengerSchema);
