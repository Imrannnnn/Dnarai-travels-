import axios from 'axios';
import { Passenger } from '../models/Passenger.js';

export const WhatsAppService = {
  async sendNotification({ passengerId, type, message, bookingId }) {
    if (!process.env.WHATSAPP_WEBHOOK_URL) return null;

    const passenger = await Passenger.findById(passengerId);
    if (!passenger?.phone) return null;

    await axios.post(process.env.WHATSAPP_WEBHOOK_URL, {
      to: passenger.phone,
      message,
      type,
      bookingId,
      passengerId: String(passenger._id),
    });

    return { ok: true };
  },
};
