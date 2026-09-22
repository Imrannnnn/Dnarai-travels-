import mongoose from 'mongoose';

const AgencySettingsSchema = new mongoose.Schema(
  {
    cardProcessingFee: {
      type: Number,
      default: 3000,
      min: 0,
    },
    serviceChargeOneWay: {
      type: Number,
      default: 5000,
      min: 0,
    },
    serviceChargeReturn: {
      type: Number,
      default: 10000,
      min: 0,
    },
    disclaimerText: {
      type: String,
      default:
        'Please note: The airline prices are subject to changes. The earlier you book, the more likely you are to secure a seat at the price shown at this time.',
    },
    footerText: {
      type: String,
      default:
        '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

/**
 * Returns the singleton agency settings document or creates a default one.
 */
AgencySettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const AgencySettings = mongoose.model('AgencySettings', AgencySettingsSchema);
