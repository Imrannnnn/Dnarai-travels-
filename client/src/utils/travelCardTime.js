import { DateTime } from 'luxon'
import { getApiBaseUrl } from '../data/api'

// Comprehensive curated mapping of major global airports to IANA timezones
export const KNOWN_AIRPORT_TIMEZONES = {
  // Nigeria (WAT / UTC+1)
  ABV: 'Africa/Lagos',
  LOS: 'Africa/Lagos',
  KAN: 'Africa/Lagos',
  PHC: 'Africa/Lagos',
  ENU: 'Africa/Lagos',
  CBQ: 'Africa/Lagos',
  ILR: 'Africa/Lagos',
  QRW: 'Africa/Lagos',
  BNI: 'Africa/Lagos',
  MIU: 'Africa/Lagos',
  YOL: 'Africa/Lagos',
  SKO: 'Africa/Lagos',
  JOS: 'Africa/Lagos',
  MDI: 'Africa/Lagos',
  AKR: 'Africa/Lagos',
  ABB: 'Africa/Lagos',
  BNC: 'Africa/Lagos',
  GMO: 'Africa/Lagos',
  QOW: 'Africa/Lagos',
  PHG: 'Africa/Lagos',
  QUO: 'Africa/Lagos',

  // United Kingdom & Ireland
  LHR: 'Europe/London',
  LGW: 'Europe/London',
  STN: 'Europe/London',
  LTN: 'Europe/London',
  LCY: 'Europe/London',
  MAN: 'Europe/London',
  EDI: 'Europe/London',
  BHX: 'Europe/London',
  GLA: 'Europe/London',
  BRS: 'Europe/London',
  NCL: 'Europe/London',
  DUB: 'Europe/Dublin',
  SNN: 'Europe/Dublin',

  // Europe Mainland
  CDG: 'Europe/Paris',
  ORY: 'Europe/Paris',
  NCE: 'Europe/Paris',
  LYS: 'Europe/Paris',
  FRA: 'Europe/Berlin',
  MUC: 'Europe/Berlin',
  BER: 'Europe/Berlin',
  DUS: 'Europe/Berlin',
  HAM: 'Europe/Berlin',
  AMS: 'Europe/Amsterdam',
  BRU: 'Europe/Brussels',
  MAD: 'Europe/Madrid',
  BCN: 'Europe/Madrid',
  VLC: 'Europe/Madrid',
  AGP: 'Europe/Madrid',
  LIS: 'Europe/Lisbon',
  OPO: 'Europe/Lisbon',
  FCO: 'Europe/Rome',
  MXP: 'Europe/Rome',
  VCE: 'Europe/Rome',
  BLQ: 'Europe/Rome',
  ZRH: 'Europe/Zurich',
  GVA: 'Europe/Zurich',
  VIE: 'Europe/Vienna',
  ATH: 'Europe/Athens',
  IST: 'Europe/Istanbul',
  SAW: 'Europe/Istanbul',
  AYT: 'Europe/Istanbul',
  WAW: 'Europe/Warsaw',
  PRG: 'Europe/Prague',
  BUD: 'Europe/Budapest',
  CPH: 'Europe/Copenhagen',
  OSL: 'Europe/Oslo',
  ARN: 'Europe/Stockholm',
  HEL: 'Europe/Helsinki',

  // Middle East
  DXB: 'Asia/Dubai',
  DWC: 'Asia/Dubai',
  AUH: 'Asia/Dubai',
  SHJ: 'Asia/Dubai',
  DOH: 'Asia/Qatar',
  JED: 'Asia/Riyadh',
  RUH: 'Asia/Riyadh',
  DMM: 'Asia/Riyadh',
  MED: 'Asia/Riyadh',
  BAH: 'Asia/Bahrain',
  KWI: 'Asia/Kuwait',
  MCT: 'Asia/Muscat',
  AMM: 'Asia/Amman',
  BEY: 'Asia/Beirut',
  TLV: 'Asia/Jerusalem',

  // North America - Eastern
  JFK: 'America/New_York',
  EWR: 'America/New_York',
  LGA: 'America/New_York',
  BOS: 'America/New_York',
  PHL: 'America/New_York',
  DCA: 'America/New_York',
  IAD: 'America/New_York',
  BWI: 'America/New_York',
  ATL: 'America/New_York',
  MIA: 'America/New_York',
  MCO: 'America/New_York',
  FLL: 'America/New_York',
  TPA: 'America/New_York',
  CLT: 'America/New_York',
  RDU: 'America/New_York',
  DTW: 'America/New_York',
  YYZ: 'America/Toronto',
  YUL: 'America/Toronto',
  YOW: 'America/Toronto',

  // North America - Central
  ORD: 'America/Chicago',
  MDW: 'America/Chicago',
  DFW: 'America/Chicago',
  IAH: 'America/Chicago',
  HOU: 'America/Chicago',
  MSP: 'America/Chicago',
  STL: 'America/Chicago',
  MCI: 'America/Chicago',
  MSY: 'America/Chicago',
  BNA: 'America/Chicago',
  SAT: 'America/Chicago',
  AUS: 'America/Chicago',

  // North America - Mountain & Pacific
  DEN: 'America/Denver',
  SLC: 'America/Denver',
  PHX: 'America/Phoenix',
  LAX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  SAN: 'America/Los_Angeles',
  LAS: 'America/Los_Angeles',
  PDX: 'America/Los_Angeles',
  SJC: 'America/Los_Angeles',
  OAK: 'America/Los_Angeles',
  YVR: 'America/Vancouver',
  YYC: 'America/Edmonton',
  YEG: 'America/Edmonton',
  ANC: 'America/Anchorage',
  HNL: 'Pacific/Honolulu',

  // Africa
  ACC: 'Africa/Accra',
  DKR: 'Africa/Dakar',
  ABJ: 'Africa/Abidjan',
  BKO: 'Africa/Bamako',
  COO: 'Africa/Porto-Novo',
  LFW: 'Africa/Lome',
  FNA: 'Africa/Freetown',
  ROB: 'Africa/Monrovia',
  OUA: 'Africa/Ouagadougou',
  NIM: 'Africa/Niamey',
  NDJ: 'Africa/Ndjamena',
  DLA: 'Africa/Douala',
  NSI: 'Africa/Douala',
  LBV: 'Africa/Libreville',
  SSG: 'Africa/Malabo',
  CAI: 'Africa/Cairo',
  HBE: 'Africa/Cairo',
  ADD: 'Africa/Addis_Ababa',
  NBO: 'Africa/Nairobi',
  MBA: 'Africa/Nairobi',
  JNB: 'Africa/Johannesburg',
  CPT: 'Africa/Johannesburg',
  DUR: 'Africa/Johannesburg',
  KGL: 'Africa/Kigali',
  EBB: 'Africa/Kampala',
  DAR: 'Africa/Dar_es_Salaam',
  ZNZ: 'Africa/Dar_es_Salaam',
  LUN: 'Africa/Lusaka',
  HRE: 'Africa/Harare',
  CAS: 'Africa/Casablanca',
  RAK: 'Africa/Casablanca',
  TUN: 'Africa/Tunis',
  ALG: 'Africa/Algiers',
  MRU: 'Indian/Mauritius',
  SEZ: 'Indian/Mahe',

  // Asia & Oceania
  BOM: 'Asia/Kolkata',
  DEL: 'Asia/Kolkata',
  BLR: 'Asia/Kolkata',
  MAA: 'Asia/Kolkata',
  HYD: 'Asia/Kolkata',
  CCU: 'Asia/Kolkata',
  COK: 'Asia/Kolkata',
  SIN: 'Asia/Singapore',
  KUL: 'Asia/Kuala_Lumpur',
  BKK: 'Asia/Bangkok',
  DMK: 'Asia/Bangkok',
  HKT: 'Asia/Bangkok',
  SGN: 'Asia/Ho_Chi_Minh',
  HAN: 'Asia/Ho_Chi_Minh',
  CGK: 'Asia/Jakarta',
  DPS: 'Asia/Makassar',
  MNL: 'Asia/Manila',
  PEK: 'Asia/Shanghai',
  PKX: 'Asia/Shanghai',
  PVG: 'Asia/Shanghai',
  SHA: 'Asia/Shanghai',
  CAN: 'Asia/Shanghai',
  SZX: 'Asia/Shanghai',
  HKG: 'Asia/Hong_Kong',
  TPE: 'Asia/Taipei',
  HND: 'Asia/Tokyo',
  NRT: 'Asia/Tokyo',
  KIX: 'Asia/Tokyo',
  ICN: 'Asia/Seoul',
  GMP: 'Asia/Seoul',
  SYD: 'Australia/Sydney',
  MEL: 'Australia/Melbourne',
  BNE: 'Australia/Brisbane',
  PER: 'Australia/Perth',
  ADL: 'Australia/Adelaide',
  AKL: 'Pacific/Auckland',
  CHC: 'Pacific/Auckland',

  // South America
  GRU: 'America/Sao_Paulo',
  GIG: 'America/Sao_Paulo',
  BSB: 'America/Sao_Paulo',
  EZE: 'America/Argentina/Buenos_Aires',
  AEP: 'America/Argentina/Buenos_Aires',
  BOG: 'America/Bogota',
  SCL: 'America/Santiago',
  LIM: 'America/Lima',
}

const timezoneCache = new Map()

/**
 * Resolve the IANA timezone for an airport IATA code
 */
export async function resolveAirportTimezone(iata, country = '') {
  if (!iata) return 'Africa/Lagos'
  const code = iata.toUpperCase().trim()

  // 1. Nigerian airports are strictly West Africa Time (Africa/Lagos)
  if (country && country.toLowerCase() === 'nigeria') return 'Africa/Lagos'

  // 2. Known local table
  if (KNOWN_AIRPORT_TIMEZONES[code]) {
    return KNOWN_AIRPORT_TIMEZONES[code]
  }

  // 3. Cache
  if (timezoneCache.has(code)) {
    return timezoneCache.get(code)
  }

  // 4. Fetch from backend /api/time/airport/:iata which derives timezone via geo-tz
  try {
    const baseUrl = getApiBaseUrl()
    const res = await fetch(`${baseUrl}/api/time/airport/${code}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.timezone) {
        timezoneCache.set(code, data.timezone)
        return data.timezone
      }
    }
  } catch (err) {
    console.warn(`[TravelCardTime] Failed to resolve timezone dynamically for ${code}:`, err)
  }

  return 'Africa/Lagos'
}

/**
 * Format date & time into both Local Airport Time and Nigeria Time (WAT / UTC+1)
 * Correctly accounts for Daylight Saving Time (DST) on the flight's travel date.
 */
export function convertFlightTimeToWat({ dateStr, timeStr, iata, country, customTz }) {
  if (!dateStr) {
    return {
      localFormatted: 'TBD',
      localTime12: 'TBD',
      localDateFormatted: '',
      watFormatted: 'TBD',
      watTime12: 'TBD',
      watDateFormatted: '',
      isDifferentTime: false,
      diffDescription: '',
      dayDiffNotice: '',
      isNigeria: true,
      timezone: 'Africa/Lagos',
    }
  }

  // Clean date and time
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim()
  const cleanTime = (timeStr || '12:00').trim().slice(0, 5)

  const code = (iata || '').toUpperCase().trim()
  const tz = customTz || KNOWN_AIRPORT_TIMEZONES[code] || (country?.toLowerCase() === 'nigeria' ? 'Africa/Lagos' : 'Africa/Lagos')

  try {
    // 1. Local DateTime in the Airport's timezone
    const localDt = DateTime.fromISO(`${cleanDate}T${cleanTime}`, { zone: tz })
    if (!localDt.isValid) {
      throw new Error(localDt.invalidExplanation)
    }

    // 2. Nigeria Equivalent DateTime (WAT is Africa/Lagos, UTC+1, no DST)
    const watDt = localDt.setZone('Africa/Lagos')

    const localFormatted = localDt.toFormat('HH:mm')
    const localTime12 = localDt.toFormat('hh:mm a')
    const localDateFormatted = localDt.toFormat('dd LLL yyyy')
    const localDayOfWeek = localDt.toFormat('ccc')

    const watFormatted = watDt.toFormat('HH:mm')
    const watTime12 = watDt.toFormat('hh:mm a')
    const watDateFormatted = watDt.toFormat('dd LLL yyyy')
    const watDayOfWeek = watDt.toFormat('ccc')

    const localOffsetHours = localDt.offset / 60
    const watOffsetHours = 1 // WAT is strictly UTC+1
    const diffHours = watOffsetHours - localOffsetHours

    const isDifferentTime = diffHours !== 0
    const isNigeria = tz === 'Africa/Lagos' || (!isDifferentTime && (country?.toLowerCase() === 'nigeria' || code === 'LOS' || code === 'ABV'))

    // Day difference relative to local date
    const dayDiff = Math.round(watDt.startOf('day').diff(localDt.startOf('day'), 'days').days)
    let dayDiffNotice = ''
    if (dayDiff > 0) {
      dayDiffNotice = `+${dayDiff} Day in Nigeria`
    } else if (dayDiff < 0) {
      dayDiffNotice = `${dayDiff} Day in Nigeria`
    }

    let diffDescription = ''
    if (isDifferentTime) {
      if (diffHours > 0) {
        diffDescription = `Nigeria is ${diffHours % 1 === 0 ? diffHours : diffHours.toFixed(1)}h ahead of local`
      } else {
        const absDiff = Math.abs(diffHours)
        diffDescription = `Nigeria is ${absDiff % 1 === 0 ? absDiff : absDiff.toFixed(1)}h behind local`
      }
    } else {
      diffDescription = 'Same as Nigeria Time'
    }

    return {
      localFormatted,
      localTime12,
      localDateFormatted,
      localDayOfWeek,
      localTzName: localDt.offsetNameShort || tz,
      localIso: localDt.toISO(),

      watFormatted,
      watTime12,
      watDateFormatted,
      watDayOfWeek,
      watTzName: 'WAT',
      watIso: watDt.toISO(),

      isDifferentTime,
      diffHours,
      diffDescription,
      dayDiffNotice,
      isNigeria,
      timezone: tz,
    }
  } catch (err) {
    console.error(`[TravelCardTime] Error parsing flight time for ${dateStr} ${timeStr}:`, err)
    return {
      localFormatted: cleanTime || '12:00',
      localTime12: cleanTime || '12:00',
      localDateFormatted: cleanDate,
      watFormatted: cleanTime || '12:00',
      watTime12: cleanTime || '12:00',
      watDateFormatted: cleanDate,
      isDifferentTime: false,
      diffDescription: '',
      dayDiffNotice: '',
      isNigeria: true,
      timezone: 'Africa/Lagos',
    }
  }
}

/**
 * Format concise full route string from journey legs
 * e.g. ABUJA (ABV) ➔ LONDON (LHR) ➔ NEW YORK (JFK) ➔ ABUJA (ABV)
 */
export function buildRouteOverviewString(legs = []) {
  if (!legs || legs.length === 0) return 'No Route Defined'

  const stops = []
  legs.forEach((leg, idx) => {
    const originLabel = `${(leg.originCity || 'Origin').toUpperCase()} (${(leg.originIata || '---').toUpperCase()})`
    const destLabel = `${(leg.destCity || 'Destination').toUpperCase()} (${(leg.destIata || '---').toUpperCase()})`

    if (idx === 0) {
      stops.push(originLabel)
    } else {
      const prevStop = stops[stops.length - 1]
      if (prevStop !== originLabel) {
        stops.push(originLabel)
      }
    }
    stops.push(destLabel)
  })

  return stops.join(' ➔ ')
}

/**
 * Calculate connection layover time between two consecutive flight legs
 */
export function calculateConnectionLayover(prevLegArrivalIso, nextLegDepartureIso) {
  if (!prevLegArrivalIso || !nextLegDepartureIso) return null

  try {
    const arr = DateTime.fromISO(prevLegArrivalIso)
    const dep = DateTime.fromISO(nextLegDepartureIso)

    if (!arr.isValid || !dep.isValid) return null

    const diffMinutes = Math.round(dep.diff(arr, 'minutes').minutes)
    if (diffMinutes < 0) {
      return {
        isInvalidOrder: true,
        text: 'Time warning: Departure is scheduled before previous arrival',
        durationStr: 'Invalid sequence',
      }
    }

    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60

    let durationStr = ''
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remHours = hours % 24
      durationStr = `${days}d ${remHours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    } else if (hours > 0) {
      durationStr = `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    } else {
      durationStr = `${mins}m`
    }

    const isOvernight = hours >= 8 || dep.day !== arr.day

    return {
      diffMinutes,
      hours,
      mins,
      durationStr,
      isOvernight,
      text: isOvernight ? `Overnight Connection • ${durationStr} layover` : `Connection Layover • ${durationStr}`,
    }
  } catch {
    return null
  }
}

/**
 * Comprehensive mapping of Airport IATA codes to State / Region names.
 * Prioritizes Nigerian states for domestic routes and regions/states for international destinations.
 */
export const KNOWN_AIRPORT_STATES = {
  // Nigeria - All 36 States & FCT
  LOS: 'Lagos',
  ABV: 'Abuja',
  KAN: 'Kano',
  PHC: 'Rivers',
  PHG: 'Rivers',
  ENU: 'Enugu',
  CBQ: 'Cross River',
  ILR: 'Kwara',
  BNI: 'Edo',
  QRW: 'Delta',
  ABB: 'Delta',
  ASA: 'Delta',
  MIU: 'Borno',
  YOL: 'Adamawa',
  SKO: 'Sokoto',
  JOS: 'Plateau',
  MDI: 'Benue',
  AKR: 'Ondo',
  GMO: 'Gombe',
  QOW: 'Imo',
  QUO: 'Akwa Ibom',
  MXJ: 'Niger',
  BCU: 'Bauchi',
  KAD: 'Kaduna',
  DKA: 'Katsina',
  IBA: 'Oyo',
  ANA: 'Anambra',
  DNBK: 'Kebbi',
  QUS: 'Osun',

  // United Kingdom & Ireland
  LHR: 'London',
  LGW: 'London',
  STN: 'London',
  LTN: 'London',
  LCY: 'London',
  MAN: 'Manchester',
  EDI: 'Edinburgh',
  BHX: 'Birmingham',
  GLA: 'Glasgow',
  BRS: 'Bristol',
  NCL: 'Newcastle',
  DUB: 'Dublin',
  SNN: 'Shannon',

  // United States
  JFK: 'New York',
  EWR: 'New Jersey',
  LGA: 'New York',
  ATL: 'Georgia',
  ORD: 'Illinois',
  MDW: 'Illinois',
  DFW: 'Texas',
  IAH: 'Texas',
  HOU: 'Texas',
  LAX: 'California',
  SFO: 'California',
  SAN: 'California',
  MIA: 'Florida',
  MCO: 'Florida',
  TPA: 'Florida',
  FLL: 'Florida',
  IAD: 'Virginia',
  DCA: 'Washington DC',
  BOS: 'Massachusetts',
  SEA: 'Washington',
  DEN: 'Colorado',
  PHX: 'Arizona',
  CLT: 'North Carolina',
  DTW: 'Michigan',
  MSP: 'Minnesota',
  PHL: 'Pennsylvania',
  LAS: 'Nevada',

  // Canada
  YYZ: 'Ontario',
  YVR: 'British Columbia',
  YUL: 'Quebec',
  YYC: 'Alberta',
  YOW: 'Ontario',

  // Middle East & Africa
  DXB: 'Dubai',
  DWC: 'Dubai',
  AUH: 'Abu Dhabi',
  SHJ: 'Sharjah',
  DOH: 'Qatar',
  JED: 'Jeddah',
  RUH: 'Riyadh',
  MED: 'Medina',
  DMM: 'Dammam',
  BAH: 'Bahrain',
  KWI: 'Kuwait',
  MCT: 'Muscat',
  AMM: 'Amman',
  BEY: 'Beirut',
  TLV: 'Tel Aviv',
  CAI: 'Cairo',
  JNB: 'Gauteng',
  CPT: 'Cape Town',
  NBO: 'Nairobi',
  ADD: 'Addis Ababa',
  ACC: 'Accra',
  KGL: 'Kigali',
  DKR: 'Dakar',
  ABJ: 'Abidjan',

  // Europe Mainland
  CDG: 'Paris',
  ORY: 'Paris',
  FRA: 'Frankfurt',
  MUC: 'Munich',
  BER: 'Berlin',
  DUS: 'Dusseldorf',
  HAM: 'Hamburg',
  AMS: 'Amsterdam',
  BRU: 'Brussels',
  MAD: 'Madrid',
  BCN: 'Barcelona',
  LIS: 'Lisbon',
  OPO: 'Porto',
  FCO: 'Rome',
  MXP: 'Milan',
  ZRH: 'Zurich',
  GVA: 'Geneva',
  VIE: 'Vienna',
  ATH: 'Athens',
  IST: 'Istanbul',
  SAW: 'Istanbul',
  WAW: 'Warsaw',
  PRG: 'Prague',
  BUD: 'Budapest',
  CPH: 'Copenhagen',
  OSL: 'Oslo',
  ARN: 'Stockholm',
  HEL: 'Helsinki',

  // Asia / Oceania
  SIN: 'Singapore',
  HND: 'Tokyo',
  NRT: 'Tokyo',
  KIX: 'Osaka',
  ICN: 'Seoul',
  BOM: 'Mumbai',
  DEL: 'Delhi',
  BLR: 'Bangalore',
  PEK: 'Beijing',
  PVG: 'Shanghai',
  CAN: 'Guangzhou',
  HKG: 'Hong Kong',
  BKK: 'Bangkok',
  KUL: 'Kuala Lumpur',
  CGK: 'Jakarta',
  MNL: 'Manila',
  SYD: 'New South Wales',
  MEL: 'Victoria',
  BNE: 'Queensland',
  PER: 'Western Australia',
  AKL: 'Auckland',
}

/**
 * Mapping of common Nigerian city names to their respective State.
 */
export const NIGERIAN_CITY_TO_STATE = {
  lagos: 'Lagos',
  ikeja: 'Lagos',
  abuja: 'Abuja',
  fct: 'Abuja',
  'port harcourt': 'Rivers',
  'port hartcourt': 'Rivers',
  kano: 'Kano',
  enugu: 'Enugu',
  calabar: 'Cross River',
  ilorin: 'Kwara',
  benin: 'Edo',
  'benin city': 'Edo',
  warri: 'Delta',
  asaba: 'Delta',
  maiduguri: 'Borno',
  yola: 'Adamawa',
  sokoto: 'Sokoto',
  jos: 'Plateau',
  makurdi: 'Benue',
  akure: 'Ondo',
  gombe: 'Gombe',
  owerri: 'Imo',
  uyo: 'Akwa Ibom',
  minna: 'Niger',
  bauchi: 'Bauchi',
  kaduna: 'Kaduna',
  katsina: 'Katsina',
  ibadan: 'Oyo',
  awka: 'Anambra',
  onitsha: 'Anambra',
  abakaliki: 'Ebonyi',
  abeokuta: 'Ogun',
  osogbo: 'Osun',
  'ado ekiti': 'Ekiti',
  'ado-ekiti': 'Ekiti',
  lokoja: 'Kogi',
  lafia: 'Nasarawa',
  jalingo: 'Taraba',
  damaturu: 'Yobe',
  gusau: 'Zamfara',
  'birnin kebbi': 'Kebbi',
  yenagoa: 'Bayelsa',
  dutse: 'Jigawa',
}

const US_STATE_CODES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington DC',
}

/**
 * Intelligent helper to resolve the State Name for flight origin or destination.
 * Used on the Travel Card time badge instead of generic 'Local' time.
 */
export function resolveStateName({ state, city, iata, fallback = 'DEP' } = {}) {
  // 1. Explicit state provided by user
  if (state && typeof state === 'string' && state.trim()) {
    return state.trim()
  }

  // 2. Check IATA Code lookup
  if (iata && typeof iata === 'string') {
    const cleanIata = iata.trim().toUpperCase()
    if (KNOWN_AIRPORT_STATES[cleanIata]) {
      return KNOWN_AIRPORT_STATES[cleanIata]
    }
  }

  // 3. Check City string
  if (city && typeof city === 'string' && city.trim()) {
    const raw = city.trim()
    const lower = raw.toLowerCase()

    // Filter out common generic placeholder labels
    if (
      lower === 'departure city' ||
      lower === 'arrival city' ||
      lower === 'origin city' ||
      lower === 'destination city' ||
      lower === 'city'
    ) {
      return fallback
    }

    // Handle comma-separated (e.g., "Dallas, Texas", "Houston, TX", "Lagos, Nigeria", "London, UK")
    if (raw.includes(',')) {
      const parts = raw.split(',').map((p) => p.trim())
      const part1Lower = (parts[0] || '').toLowerCase()
      const part2Upper = (parts[1] || '').toUpperCase()

      // Nigerian city check in part 1
      if (NIGERIAN_CITY_TO_STATE[part1Lower]) {
        return NIGERIAN_CITY_TO_STATE[part1Lower]
      }

      // US State abbreviation in part 2 (e.g., "Dallas, TX")
      if (US_STATE_CODES[part2Upper]) {
        return US_STATE_CODES[part2Upper]
      }

      // If part 2 is a country name like Nigeria, UK, USA, return part 1
      const part2Lower = (parts[1] || '').toLowerCase()
      if (['nigeria', 'uk', 'united kingdom', 'usa', 'united states', 'canada'].includes(part2Lower)) {
        return parts[0]
      }

      // Otherwise, return part 2 if it's descriptive, or part 1
      return parts[1] || parts[0]
    }

    // Direct Nigerian city check
    if (NIGERIAN_CITY_TO_STATE[lower]) {
      return NIGERIAN_CITY_TO_STATE[lower]
    }

    return raw
  }

  return fallback
}
