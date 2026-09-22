import { DateTime } from 'luxon';

/**
 * Helper to get ordinal suffix for day of month (e.g. 1st, 2nd, 3rd, 16th, 19th)
 */
export function getOrdinalSuffix(day) {
  const d = parseInt(day, 10);
  if (isNaN(d)) return day;
  const j = d % 10;
  const k = d % 100;
  if (j === 1 && k !== 11) return `${d}st`;
  if (j === 2 && k !== 12) return `${d}nd`;
  if (j === 3 && k !== 13) return `${d}rd`;
  return `${d}th`;
}

/**
 * Formats a Date object or ISO string to e.g. "Wednesday, 16th"
 */
export function formatFlightDate(dateInput) {
  if (!dateInput) return '';
  let dt;
  if (dateInput instanceof Date) {
    dt = DateTime.fromJSDate(dateInput);
  } else if (typeof dateInput === 'string') {
    dt = DateTime.fromISO(dateInput);
    if (!dt.isValid) {
      // Fallback if not standard ISO
      dt = DateTime.fromJSDate(new Date(dateInput));
    }
  } else {
    return '';
  }

  if (!dt.isValid) return '';

  const weekday = dt.toFormat('cccc'); // 'Wednesday', 'Saturday', etc.
  const dayWithOrdinal = getOrdinalSuffix(dt.day);
  return `${weekday}, ${dayWithOrdinal}`;
}

/**
 * Format currency with commas, e.g. 105000 -> "105,000"
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-NG');
}

/**
 * Normalize phone numbers to international WhatsApp format (defaulting Nigerian prefix 234)
 */
export function normalizeWhatsAppPhone(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '234' + digits.slice(1);
  } else if (digits.startsWith('234')) {
    // Already in 234 format
  } else if (digits.length === 10) {
    digits = '234' + digits;
  }
  return digits;
}

export const QuotationService = {
  /**
   * Recalculates and validates all fare groups within airline options.
   * Total = baseFare + cardProcessingFee.
   */
  processAirlineOptions(airlineOptions = [], cardProcessingFee = 3000) {
    const fee = Math.max(0, Number(cardProcessingFee) || 0);

    return airlineOptions
      .map((option) => {
        const airlineName = String(option.airlineName || '').trim();
        if (!airlineName) return null;

        const rawFareGroups = Array.isArray(option.fareGroups) ? option.fareGroups : [];
        const fareGroups = rawFareGroups
          .map((fg) => {
            let times = [];
            if (Array.isArray(fg.times)) {
              times = fg.times.map((t) => String(t).trim()).filter(Boolean);
            } else if (typeof fg.times === 'string') {
              times = fg.times
                .split(/[,;\n]/)
                .map((t) => t.trim())
                .filter(Boolean);
            }

            const baseFare = Math.max(0, Number(fg.baseFare) || 0);
            const totalFlightPrice = baseFare + fee;

            return {
              times,
              baseFare,
              cardProcessingFee: fee,
              totalFlightPrice,
            };
          })
          .filter((fg) => fg.times.length > 0 || fg.baseFare > 0);

        return {
          airlineName,
          fareGroups,
        };
      })
      .filter(Boolean);
  },

  /**
   * Calculates applicable service charge based on trip type and passenger count.
   */
  calculateServiceCharge(tripType, passengerCount = 1, settings) {
    const count = Math.max(1, parseInt(passengerCount, 10) || 1);
    const isReturn = tripType === 'return';

    const serviceChargePerPerson = isReturn
      ? Number(settings?.serviceChargeReturn ?? 10000)
      : Number(settings?.serviceChargeOneWay ?? 5000);

    const totalServiceCharge = serviceChargePerPerson * count;

    return {
      serviceChargePerPerson,
      totalServiceCharge,
      passengerCount: count,
    };
  },

  /**
   * Formats a single airline option block for WhatsApp.
   */
  formatAirlineBlock(airline) {
    if (!airline || !airline.airlineName) return '';

    const lines = [`*${airline.airlineName}*`];

    const fareGroups = Array.isArray(airline.fareGroups) ? airline.fareGroups : [];
    const formattedGroups = [];

    for (const fg of fareGroups) {
      const timesStr = (fg.times || []).join(', ');
      const baseFare = Number(fg.baseFare) || 0;
      const fee = Number(fg.cardProcessingFee) || 0;
      const total =
        fg.totalFlightPrice != null && Number(fg.totalFlightPrice) > 0
          ? Number(fg.totalFlightPrice)
          : baseFare + fee;
      const hasFare = total > 0 || baseFare > 0;
      const fareStr = hasFare
        ? fee > 0
          ? `(@₦${formatCurrency(total)} fare + card processing fee)`
          : `(@₦${formatCurrency(total)} fare)`
        : '';

      if ((fg.times || []).length <= 1 && timesStr && fareStr) {
        // Single time on same line: "5pm (@₦741,400 fare + card processing fee)"
        formattedGroups.push(`${timesStr} ${fareStr}`);
      } else if (timesStr && fareStr) {
        // Multiple times on line 1, breakdown on line 2:
        // "03:05pm, 4:40pm, 8:00pm"
        // "(@₦108,000 fare + card processing fee)"
        formattedGroups.push(`${timesStr}\n${fareStr}`);
      } else if (timesStr) {
        formattedGroups.push(timesStr);
      } else if (fareStr) {
        formattedGroups.push(fareStr);
      }
    }

    if (formattedGroups.length > 0) {
      // If any group has multiple lines (contains newline), separate groups with blank line for readability
      const hasMultiLine = formattedGroups.some((g) => g.includes('\n'));
      lines.push(formattedGroups.join(hasMultiLine ? '\n\n' : '\n'));
    }

    return lines.join('\n');
  },

  /**
   * Generates the complete WhatsApp quotation message adhering to D.Narai brand styling.
   */
  formatWhatsAppMessage(quotation, settings) {
    const isReturn = quotation.tripType === 'return';
    const origin = quotation.originCity || 'Departure';
    const destination = quotation.destinationCity || 'Destination';

    const outboundDateStr = formatFlightDate(quotation.departureDate);
    const returnDateStr = formatFlightDate(quotation.returnDate);

    const { serviceChargePerPerson, totalServiceCharge, passengerCount } =
      this.calculateServiceCharge(quotation.tripType, quotation.passengerCount, settings);

    const sections = [];

    // 1. Header & Outbound Direction
    if (isReturn) {
      sections.push('*Flight Option Inbound Ticket:*');
    } else {
      sections.push('*Flight Option One Way Ticket:*');
    }

    sections.push(`*${origin} → ${destination}*`);

    if (outboundDateStr) {
      sections.push(`*${outboundDateStr}*`);
    }

    // 2. Outbound Airlines
    const outboundFlights = Array.isArray(quotation.outboundFlights)
      ? quotation.outboundFlights
      : [];

    const outboundBlocks = outboundFlights
      .map((flight) => this.formatAirlineBlock(flight))
      .filter(Boolean);

    if (outboundBlocks.length > 0) {
      sections.push(outboundBlocks.join('\n\n'));
    }

    // 3. Return Section (if applicable)
    if (isReturn) {
      if (returnDateStr) {
        sections.push(`*${returnDateStr}*`);
      }
      sections.push(`*${destination} → ${origin}*`);

      const returnFlights = Array.isArray(quotation.returnFlights)
        ? quotation.returnFlights
        : [];

      const returnBlocks = returnFlights
        .map((flight) => this.formatAirlineBlock(flight))
        .filter(Boolean);

      if (returnBlocks.length > 0) {
        sections.push(returnBlocks.join('\n\n'));
      }
    }

    // 4. Service Charge Notice
    const tripTypeLabel = isReturn ? 'two-way' : 'one-way';
    let serviceChargeLine = `*Service Charge:* ₦${formatCurrency(serviceChargePerPerson)} per person for a ${tripTypeLabel} local ticket`;
    if (passengerCount > 1) {
      serviceChargeLine += ` (Total: ₦${formatCurrency(totalServiceCharge)} for ${passengerCount} passengers)`;
    }
    sections.push(serviceChargeLine);

    // 5. Disclaimer & Footer
    const disclaimer =
      settings?.disclaimerText ||
      'Please note: The airline prices are subject to changes. The earlier you book, the more likely you are to secure a seat at the price shown at this time.';
    const footer =
      settings?.footerText ||
      '-~ *D.Narai*\n*Our services end when you successfully arrive at your destination*';

    sections.push(disclaimer);
    sections.push(footer);

    return sections.join('\n\n');
  },
};
