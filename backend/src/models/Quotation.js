import mongoose from 'mongoose';

const FareGroupSchema = new mongoose.Schema(
  {
    times: {
      type: [String],
      required: true,
      default: [],
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0,
    },
    cardProcessingFee: {
      type: Number,
      required: true,
      default: 3000,
      min: 0,
    },
    totalFlightPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const AirlineOptionSchema = new mongoose.Schema(
  {
    airlineName: {
      type: String,
      required: true,
      trim: true,
    },
    fareGroups: {
      type: [FareGroupSchema],
      required: true,
      default: [],
    },
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: false,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    clientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    tripType: {
      type: String,
      enum: ['one_way', 'return'],
      default: 'one_way',
      required: true,
    },
    passengerCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    originCity: {
      type: String,
      required: true,
      trim: true,
    },
    originIata: {
      type: String,
      trim: true,
      uppercase: true,
    },
    destinationCity: {
      type: String,
      required: true,
      trim: true,
    },
    destinationIata: {
      type: String,
      trim: true,
      uppercase: true,
    },
    departureDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
    },
    outboundFlights: {
      type: [AirlineOptionSchema],
      default: [],
    },
    returnFlights: {
      type: [AirlineOptionSchema],
      default: [],
    },
    cardProcessingFee: {
      type: Number,
      required: true,
      default: 3000,
      min: 0,
    },
    serviceChargePerPerson: {
      type: Number,
      required: true,
      default: 5000,
      min: 0,
    },
    totalServiceCharge: {
      type: Number,
      required: true,
      default: 5000,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'expired', 'cancelled'],
      default: 'draft',
      index: true,
    },
    generatedMessage: {
      type: String,
    },
    notes: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const Quotation = mongoose.model('Quotation', QuotationSchema);
