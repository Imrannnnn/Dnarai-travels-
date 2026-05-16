import { Invoice } from '../models/Invoice.js';
import { Passenger } from '../models/Passenger.js';

export const createInvoice = async (req, res) => {
  try {
    const {
      passengerId,
      passengerName,
      passengerEmail,
      passengerPhone,
      items,
      serviceCharge,
      subTotal,
      discount,
      total,
      balanceDue,
      paymentType,
      currency,
      date,
      invoiceNumber
    } = req.body;

    let finalPassengerName = passengerName;
    let finalPassengerEmail = passengerEmail;
    let finalPassengerPhone = passengerPhone;

    // If passengerId is provided, fetch details to ensure correctness
    if (passengerId && passengerId !== "") {
      const passenger = await Passenger.findById(passengerId);
      if (passenger) {
        finalPassengerName = passenger.fullName;
        finalPassengerEmail = passenger.email;
        finalPassengerPhone = passenger.phone;
      }
    }

    const newInvoice = new Invoice({
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      date: date || new Date(),
      passengerId: (passengerId && passengerId !== "") ? passengerId : undefined,
      passengerName: finalPassengerName,
      passengerEmail: finalPassengerEmail,
      passengerPhone: finalPassengerPhone,
      items,
      serviceCharge,
      subTotal,
      discount,
      total,
      balanceDue,
      paymentType,
      currency
    });

    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).populate('passengerId');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('passengerId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllInvoices = async (req, res) => {
  try {
    await Invoice.deleteMany({});
    res.json({ message: 'All invoices deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { passengerId, pdfBase64, manualEmail, manualName } = req.body;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    let targetEmail = manualEmail || invoice.passengerEmail;
    let targetName = manualName || invoice.passengerName;

    // If passengerId is provided, try to get the latest email/name from the Passenger model
    if (passengerId && passengerId !== "") {
      const passenger = await Passenger.findById(passengerId);
      if (passenger) {
        targetEmail = passenger.email;
        targetName = passenger.fullName;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ message: 'No email address found for this invoice' });
    }
    
    const { EmailService } = await import('../services/EmailService.js');
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    const emailRes = await EmailService.sendInvoiceEmail({
      email: targetEmail,
      passengerName: targetName,
      invoiceNumber: invoice.invoiceNumber,
      pdfBuffer
    });
    
    res.json({ 
      message: 'Invoice sent to email', 
      emailStatus: emailRes.ok ? 'sent' : 'failed',
      emailError: emailRes.error
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
