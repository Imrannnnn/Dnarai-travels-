import { Quotation } from '../models/Quotation.js';
import { AgencySettings } from '../models/AgencySettings.js';
import { Passenger } from '../models/Passenger.js';
import { QuotationService } from '../services/QuotationService.js';

export const quotationController = {
  /**
   * List all quotations with filtering, search, and pagination
   */
  async getQuotations(req, res, next) {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { quotationNumber: searchRegex },
          { clientName: searchRegex },
          { clientPhone: searchRegex },
          { originCity: searchRegex },
          { destinationCity: searchRegex },
        ];
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [quotations, total] = await Promise.all([
        Quotation.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('passengerId', 'fullName email phone'),
        Quotation.countDocuments(query),
      ]);

      res.json({
        quotations,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single quotation by ID
   */
  async getQuotationById(req, res, next) {
    try {
      const quotation = await Quotation.findById(req.params.id).populate('passengerId');
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }
      res.json(quotation);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new structured quotation
   */
  async createQuotation(req, res, next) {
    try {
      const body = req.validated.body;
      const settings = await AgencySettings.getSettings();

      const cardProcessingFee =
        body.cardProcessingFee !== undefined && body.cardProcessingFee !== null
          ? Number(body.cardProcessingFee)
          : settings.cardProcessingFee;

      let clientName = body.clientName;
      let clientPhone = body.clientPhone;
      let clientEmail = body.clientEmail;

      if (body.passengerId) {
        const passenger = await Passenger.findById(body.passengerId);
        if (passenger) {
          if (!clientName) clientName = passenger.fullName;
          if (!clientPhone) clientPhone = passenger.phone;
          if (!clientEmail) clientEmail = passenger.email;
        }
      }

      const outboundFlights = QuotationService.processAirlineOptions(
        body.outboundFlights,
        cardProcessingFee
      );

      const returnFlights =
        body.tripType === 'return'
          ? QuotationService.processAirlineOptions(body.returnFlights, cardProcessingFee)
          : [];

      const { serviceChargePerPerson, totalServiceCharge } =
        QuotationService.calculateServiceCharge(body.tripType, body.passengerCount, settings);

      const countToday = await Quotation.countDocuments();
      const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
      const quotationNumber = `QT-${datePrefix}-${String(countToday + 1).padStart(4, '0')}`;

      const quotationPayload = {
        quotationNumber,
        passengerId: body.passengerId || undefined,
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
        tripType: body.tripType,
        passengerCount: body.passengerCount,
        originCity: body.originCity,
        originIata: body.originIata || undefined,
        destinationCity: body.destinationCity,
        destinationIata: body.destinationIata || undefined,
        departureDate: new Date(body.departureDate),
        returnDate: body.returnDate ? new Date(body.returnDate) : undefined,
        outboundFlights,
        returnFlights,
        cardProcessingFee,
        serviceChargePerPerson,
        totalServiceCharge,
        status: body.status || 'draft',
        notes: body.notes || undefined,
        createdBy: req.user?.sub,
      };

      // Generate WhatsApp message snapshot
      quotationPayload.generatedMessage = QuotationService.formatWhatsAppMessage(
        quotationPayload,
        settings
      );

      const newQuotation = await Quotation.create(quotationPayload);
      res.status(201).json(newQuotation);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing quotation
   */
  async updateQuotation(req, res, next) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }

      const body = req.validated.body;
      const settings = await AgencySettings.getSettings();

      const cardProcessingFee =
        body.cardProcessingFee !== undefined && body.cardProcessingFee !== null
          ? Number(body.cardProcessingFee)
          : quotation.cardProcessingFee;

      if (body.clientName) quotation.clientName = body.clientName;
      if (body.clientPhone) quotation.clientPhone = body.clientPhone;
      if (body.clientEmail !== undefined) quotation.clientEmail = body.clientEmail;
      if (body.tripType) quotation.tripType = body.tripType;
      if (body.passengerCount) quotation.passengerCount = body.passengerCount;
      if (body.originCity) quotation.originCity = body.originCity;
      if (body.originIata !== undefined) quotation.originIata = body.originIata;
      if (body.destinationCity) quotation.destinationCity = body.destinationCity;
      if (body.destinationIata !== undefined) quotation.destinationIata = body.destinationIata;
      if (body.departureDate) quotation.departureDate = new Date(body.departureDate);
      if (body.returnDate !== undefined) {
        quotation.returnDate = body.returnDate ? new Date(body.returnDate) : undefined;
      }
      if (body.notes !== undefined) quotation.notes = body.notes;

      quotation.cardProcessingFee = cardProcessingFee;

      if (body.outboundFlights) {
        quotation.outboundFlights = QuotationService.processAirlineOptions(
          body.outboundFlights,
          cardProcessingFee
        );
      } else {
        // Re-process existing with new fee
        quotation.outboundFlights = QuotationService.processAirlineOptions(
          quotation.outboundFlights,
          cardProcessingFee
        );
      }

      if (quotation.tripType === 'return') {
        if (body.returnFlights) {
          quotation.returnFlights = QuotationService.processAirlineOptions(
            body.returnFlights,
            cardProcessingFee
          );
        } else {
          quotation.returnFlights = QuotationService.processAirlineOptions(
            quotation.returnFlights,
            cardProcessingFee
          );
        }
      } else {
        quotation.returnFlights = [];
      }

      const { serviceChargePerPerson, totalServiceCharge } =
        QuotationService.calculateServiceCharge(
          quotation.tripType,
          quotation.passengerCount,
          settings
        );
      quotation.serviceChargePerPerson = serviceChargePerPerson;
      quotation.totalServiceCharge = totalServiceCharge;

      if (body.status) {
        if (body.status === 'sent' && quotation.status !== 'sent') {
          quotation.sentAt = new Date();
        }
        quotation.status = body.status;
      }

      // Re-generate WhatsApp message snapshot
      quotation.generatedMessage = QuotationService.formatWhatsAppMessage(quotation, settings);

      await quotation.save();
      res.json(quotation);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update quotation status
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.validated.body;
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }

      quotation.status = status;
      if (status === 'sent') {
        quotation.sentAt = new Date();
      }

      await quotation.save();
      res.json(quotation);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a quotation
   */
  async deleteQuotation(req, res, next) {
    try {
      const quotation = await Quotation.findByIdAndDelete(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }
      res.json({ message: 'Quotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get agency quotation settings
   */
  async getSettings(_req, res, next) {
    try {
      const settings = await AgencySettings.getSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update agency quotation settings
   */
  async updateSettings(req, res, next) {
    try {
      const body = req.validated.body;
      let settings = await AgencySettings.findOne();
      if (!settings) {
        settings = new AgencySettings();
      }

      if (body.cardProcessingFee !== undefined) {
        settings.cardProcessingFee = Number(body.cardProcessingFee);
      }
      if (body.serviceChargeOneWay !== undefined) {
        settings.serviceChargeOneWay = Number(body.serviceChargeOneWay);
      }
      if (body.serviceChargeReturn !== undefined) {
        settings.serviceChargeReturn = Number(body.serviceChargeReturn);
      }
      if (body.disclaimerText !== undefined) {
        settings.disclaimerText = body.disclaimerText;
      }
      if (body.footerText !== undefined) {
        settings.footerText = body.footerText;
      }

      settings.updatedBy = req.user?.sub;
      await settings.save();

      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Preview WhatsApp formatted quotation without saving
   */
  async previewMessage(req, res, next) {
    try {
      const body = req.validated.body;
      const settings = await AgencySettings.getSettings();

      const cardProcessingFee =
        body.cardProcessingFee !== undefined && body.cardProcessingFee !== null
          ? Number(body.cardProcessingFee)
          : settings.cardProcessingFee;

      const outboundFlights = QuotationService.processAirlineOptions(
        body.outboundFlights,
        cardProcessingFee
      );

      const returnFlights =
        body.tripType === 'return'
          ? QuotationService.processAirlineOptions(body.returnFlights, cardProcessingFee)
          : [];

      const { serviceChargePerPerson, totalServiceCharge } =
        QuotationService.calculateServiceCharge(body.tripType, body.passengerCount, settings);

      const message = QuotationService.formatWhatsAppMessage(
        {
          ...body,
          outboundFlights,
          returnFlights,
          cardProcessingFee,
        },
        settings
      );

      res.json({
        message,
        cardProcessingFee,
        serviceChargePerPerson,
        totalServiceCharge,
        outboundFlights,
        returnFlights,
      });
    } catch (err) {
      next(err);
    }
  },
};
