import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Quotation } from '../models/Quotation.js';
import { AgencySettings } from '../models/AgencySettings.js';
import { QuotationService } from '../services/QuotationService.js';

dotenv.config();

async function testEndpoints() {
  console.log('Connecting to MongoDB...');
  await connectDb();

  console.log('1. Testing AgencySettings.getSettings()...');
  const settings = await AgencySettings.getSettings();
  console.log('Current settings:', {
    cardProcessingFee: settings.cardProcessingFee,
    serviceChargeOneWay: settings.serviceChargeOneWay,
    serviceChargeReturn: settings.serviceChargeReturn,
  });

  console.log('2. Testing Quotation Creation...');
  const testQuotationData = {
    quotationNumber: `TEST-QT-${Date.now()}`,
    clientName: 'Alhaji Ibrahim Danladi',
    clientPhone: '08023456789',
    clientEmail: 'ibrahim.d@example.com',
    tripType: 'return',
    passengerCount: 2,
    originCity: 'Abuja',
    originIata: 'ABV',
    destinationCity: 'Lagos',
    destinationIata: 'LOS',
    departureDate: new Date('2026-10-14'),
    returnDate: new Date('2026-10-17'),
    cardProcessingFee: settings.cardProcessingFee,
    outboundFlights: QuotationService.processAirlineOptions(
      [
        {
          airlineName: 'Air Peace',
          fareGroups: [
            {
              times: ['03:05pm', '4:40pm', '8:00pm'],
              baseFare: 105000,
            },
          ],
        },
      ],
      settings.cardProcessingFee
    ),
    returnFlights: QuotationService.processAirlineOptions(
      [
        {
          airlineName: 'Air Peace',
          fareGroups: [
            {
              times: ['10:35am', '2:40pm'],
              baseFare: 240100,
            },
          ],
        },
      ],
      settings.cardProcessingFee
    ),
    ...QuotationService.calculateServiceCharge('return', 2, settings),
    status: 'draft',
  };

  testQuotationData.generatedMessage = QuotationService.formatWhatsAppMessage(
    testQuotationData,
    settings
  );

  const created = await Quotation.create(testQuotationData);
  console.log('Quotation created successfully! ID:', created._id, 'Total Outbound Price:', created.outboundFlights[0].fareGroups[0].totalFlightPrice);
  console.log('Service Charge Total for 2 passengers:', created.totalServiceCharge);
  console.log('\nGenerated WhatsApp Message Snapshot:\n', created.generatedMessage);

  console.log('\n3. Testing status update to "sent"...');
  created.status = 'sent';
  created.sentAt = new Date();
  await created.save();
  console.log('Status updated to sent!');

  console.log('\n4. Cleaning up test quotation...');
  await Quotation.findByIdAndDelete(created._id);
  console.log('Cleaned up test quotation.');

  await mongoose.disconnect();
  console.log('All backend integration tests succeeded!');
}

testEndpoints().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
