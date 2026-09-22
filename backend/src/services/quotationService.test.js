import { QuotationService, getOrdinalSuffix, formatFlightDate, formatAirlineName, formatCurrency, normalizeWhatsAppPhone } from './QuotationService.js';

describe('QuotationService', () => {
  describe('Utility functions', () => {
    test('getOrdinalSuffix formats days properly', () => {
      expect(getOrdinalSuffix(1)).toBe('1st');
      expect(getOrdinalSuffix(2)).toBe('2nd');
      expect(getOrdinalSuffix(3)).toBe('3rd');
      expect(getOrdinalSuffix(4)).toBe('4th');
      expect(getOrdinalSuffix(11)).toBe('11th');
      expect(getOrdinalSuffix(12)).toBe('12th');
      expect(getOrdinalSuffix(13)).toBe('13th');
      expect(getOrdinalSuffix(16)).toBe('16th');
      expect(getOrdinalSuffix(19)).toBe('19th');
      expect(getOrdinalSuffix(21)).toBe('21st');
      expect(getOrdinalSuffix(22)).toBe('22nd');
      expect(getOrdinalSuffix(23)).toBe('23rd');
      expect(getOrdinalSuffix(31)).toBe('31st');
    });

    test('formatFlightDate formats to Weekday, Day with ordinal, and Month', () => {
      // 2026-10-14 is a Wednesday
      const wednesday = '2026-10-14';
      expect(formatFlightDate(wednesday)).toBe('Wed, 14th, October');

      // 2026-09-19 is a Saturday
      const saturday = '2026-09-19';
      expect(formatFlightDate(saturday)).toBe('Sat, 19th, September');
    });

    test('formatCurrency formats amounts with comma separators', () => {
      expect(formatCurrency(105000)).toBe('105,000');
      expect(formatCurrency(3000)).toBe('3,000');
      expect(formatCurrency(131394)).toBe('131,394');
    });

    test('formatAirlineName capitalizes each word properly', () => {
      expect(formatAirlineName('fly united')).toBe('Fly United');
      expect(formatAirlineName('air peace')).toBe('Air Peace');
      expect(formatAirlineName('IBOM AIR')).toBe('Ibom Air');
      expect(formatAirlineName('ValueJet')).toBe('ValueJet');
    });

    test('normalizeWhatsAppPhone cleans and prepends 234', () => {
      expect(normalizeWhatsAppPhone('08012345678')).toBe('2348012345678');
      expect(normalizeWhatsAppPhone('+234 801 234 5678')).toBe('2348012345678');
      expect(normalizeWhatsAppPhone('2348012345678')).toBe('2348012345678');
    });
  });

  describe('Pricing and Options processing', () => {
    test('processAirlineOptions recalculates total with card processing fee', () => {
      const options = [
        {
          airlineName: 'Air Peace',
          fareGroups: [
            {
              times: ['03:05 PM', '04:40 PM', '08:00 PM'],
              baseFare: 105000,
            },
          ],
        },
        {
          airlineName: 'Arik Air',
          fareGroups: [
            { times: ['1:00 PM'], baseFare: 131394 },
            { times: ['4:00 PM'], baseFare: 109965 },
          ],
        },
      ];

      const processed = QuotationService.processAirlineOptions(options, 3000);

      expect(processed).toHaveLength(2);
      expect(processed[0].airlineName).toBe('Air Peace');
      expect(processed[0].fareGroups[0].baseFare).toBe(105000);
      expect(processed[0].fareGroups[0].cardProcessingFee).toBe(3000);
      expect(processed[0].fareGroups[0].totalFlightPrice).toBe(108000);

      expect(processed[1].fareGroups).toHaveLength(2);
      expect(processed[1].fareGroups[0].totalFlightPrice).toBe(134394);
      expect(processed[1].fareGroups[1].totalFlightPrice).toBe(112965);
    });

    test('calculateServiceCharge handles one-way and return with passenger count', () => {
      const settings = {
        serviceChargeOneWay: 5000,
        serviceChargeReturn: 10000,
      };

      const oneWay = QuotationService.calculateServiceCharge('one_way', 1, settings);
      expect(oneWay.serviceChargePerPerson).toBe(5000);
      expect(oneWay.totalServiceCharge).toBe(5000);

      const returnTrip2Pax = QuotationService.calculateServiceCharge('return', 2, settings);
      expect(returnTrip2Pax.serviceChargePerPerson).toBe(10000);
      expect(returnTrip2Pax.totalServiceCharge).toBe(20000);
    });
  });

  describe('WhatsApp Message Generation', () => {
    test('generates expected WhatsApp message structure for Return Ticket matching prompt specification', () => {
      const quotation = {
        tripType: 'return',
        originCity: 'Abuja',
        destinationCity: 'Lagos',
        departureDate: '2026-09-16', // Wednesday
        returnDate: '2026-09-19', // Saturday
        passengerCount: 1,
        cardProcessingFee: 3000,
        outboundFlights: [
          {
            airlineName: 'Air Peace',
            fareGroups: [
              {
                times: ['03:05pm', '4:40pm', '8:00pm'],
                baseFare: 105000,
                cardProcessingFee: 3000,
                totalFlightPrice: 108000,
              },
            ],
          },
          {
            airlineName: 'Arik Air',
            fareGroups: [
              {
                times: ['1:00pm'],
                baseFare: 131394,
                cardProcessingFee: 3000,
                totalFlightPrice: 134394,
              },
              {
                times: ['4:00pm'],
                baseFare: 109965,
                cardProcessingFee: 3000,
                totalFlightPrice: 112965,
              },
            ],
          },
        ],
        returnFlights: [
          {
            airlineName: 'Air Peace',
            fareGroups: [
              {
                times: ['10:35am', '2:40pm'],
                baseFare: 240100,
                cardProcessingFee: 3000,
                totalFlightPrice: 243100,
              },
            ],
          },
        ],
      };

      const settings = {
        cardProcessingFee: 3000,
        serviceChargeOneWay: 5000,
        serviceChargeReturn: 10000,
        disclaimerText:
          'Please note: The airline prices are subject to changes. The earlier you book, the more likely you are to secure a seat at the price shown at this time.',
        footerText:
          '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*',
      };

      const msg = QuotationService.formatWhatsAppMessage(quotation, settings);

      expect(msg).toContain('*Flight Option Inbound Ticket:*');
      expect(msg).toContain('*Abuja → Lagos*');
      expect(msg).toContain('*Wed, 16th, September*');
      expect(msg).toContain('*Air Peace*');
      expect(msg).toContain('03:05pm, 4:40pm, 8:00pm');
      expect(msg).toContain('@ ₦108,000 (Fare + Card Processing Fee)');

      expect(msg).toContain('*Arik Air*');
      expect(msg).toContain('1:00pm @ ₦134,394 (Fare + Card Processing Fee)');
      expect(msg).toContain('4:00pm @ ₦112,965 (Fare + Card Processing Fee)');

      expect(msg).toContain('*Sat, 19th, September*');
      expect(msg).toContain('*Lagos → Abuja*');
      expect(msg).toContain('@ ₦243,100 (Fare + Card Processing Fee)');

      expect(msg).toContain('*Service Charge:* ₦10,000 per person for a two-way local ticket');
      expect(msg).toContain('Please note: The airline prices are subject to changes.');
      expect(msg).toContain('-~ *D.Narai*');
      expect(msg).toContain('*Our services end when you successfully arrive at your destination*');
    });

    test('formats airline block with total fare and "(Fare + Card Processing Fee)" (e.g. fly united 8:40am)', () => {
      const airline = {
        airlineName: 'fly united',
        fareGroups: [
          {
            times: ['8:40am'],
            baseFare: 116500,
            cardProcessingFee: 3000,
            totalFlightPrice: 119500,
          },
        ],
      };
      const block = QuotationService.formatAirlineBlock(airline);
      expect(block).toBe('*Fly United*\n8:40am @ ₦119,500 (Fare + Card Processing Fee)');
    });
  });
});
