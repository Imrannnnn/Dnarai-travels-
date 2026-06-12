import mongoose from 'mongoose';
import { encryptSensitive, decryptSensitive, maskLast4 } from '../utils/crypto.js';

const PassengerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, index: true, lowercase: true },
    phone: { type: String },

    documentType: { type: String, enum: ['passport', 'international_card'], default: 'passport' },
    documentNumberEnc: { type: String },
    documentNumberLast4: { type: String },
    documentExpiryDate: { type: Date },

    passportIssueDate: { type: Date },
    passportDob: { type: Date },
    passportNameEnc: { type: String },
    passportCountryIssue: { type: String },

    frequentFlyerNumbers: [
      {
        airlineName: { type: String, required: true },
        frequentFlyerNumber: { type: String, required: true }
      }
    ],
  },
  { timestamps: true }
);

PassengerSchema.methods.setDocumentNumber = function (plainNumber) {
  const raw = String(plainNumber);
  this.documentNumberEnc = encryptSensitive(raw);
  this.documentNumberLast4 = raw.slice(-4);
};

PassengerSchema.methods.setPassportName = function (plainName) {
  if (plainName) {
    this.passportNameEnc = encryptSensitive(String(plainName));
  } else {
    this.passportNameEnc = undefined;
  }
};

PassengerSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    documentType: this.documentType,
    documentNumberMasked: maskLast4(this.documentNumberLast4),
    documentNumberFull: this.documentNumberEnc ? decryptSensitive(this.documentNumberEnc) : '',
    documentExpiryDate: this.documentExpiryDate,
    passportIssueDate: this.passportIssueDate,
    passportDob: this.passportDob,
    passportName: this.passportNameEnc ? decryptSensitive(this.passportNameEnc) : '',
    passportCountryIssue: this.passportCountryIssue,
    frequentFlyerNumbers: this.frequentFlyerNumbers || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Passenger = mongoose.model('Passenger', PassengerSchema);
