import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  rate: { type: Number, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, required: true },
  subText: { type: String },
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: false, // Now optional
    },
    passengerName: { type: String, required: true },
    passengerEmail: { type: String },
    passengerPhone: { type: String },
    items: [InvoiceItemSchema],
    serviceCharge: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    balanceDue: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ['cash', 'bank_transfer'],
      required: true,
    },
    currency: { type: String, required: true }, // e.g., '₦', '$'
    notes: { type: String, default: "Our services end when you successfully arrived at your destination" },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
