import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTimeInfo, convertToLocal, getTimezoneFromCoords } from '../utils/timeZoneHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AIRPORTS_PATH = path.resolve(__dirname, '../../airports.json');

let airportsCache = null;

export const TimeService = {
  /**
   * Load airports from JSON file with caching
   */
  async loadAirports() {
    if (airportsCache) return airportsCache;
    try {
      const data = await fs.readFile(AIRPORTS_PATH, 'utf-8');
      airportsCache = JSON.parse(data);
      return airportsCache;
    } catch (error) {
      console.error('Error loading airports.json:', error);
      return [];
    }
  },

  /**
   * Search airports by city, name or IATA code
   * @param {string} query 
   */
  async searchAirports(query) {
    if (!query || query.length < 2) return [];
    const airports = await this.loadAirports();
    const q = query.toLowerCase();
    
    return airports.filter(a => 
      (a.iata && a.iata.toLowerCase() === q) || 
      (a.city && a.city.toLowerCase().includes(q)) || 
      (a.airport_name && a.airport_name.toLowerCase().includes(q))
    ).slice(0, 15);
  },

  /**
   * Get airport details with live local time
   * @param {string} iata 
   */
  async getAirportTime(iata) {
    console.log(`[TimeService] Fetching time for airport: ${iata}`);
    const airports = await this.loadAirports();
    const airport = airports.find(a => a.iata === iata);
    if (!airport) {
      console.warn(`[TimeService] Airport not found: ${iata}`);
      return null;
    }

    const lat = parseFloat(airport.latitude);
    const lon = parseFloat(airport.longitude);
    
    if (isNaN(lat) || isNaN(lon)) {
      return { ...airport, error: 'Invalid coordinates' };
    }

    const timeInfo = getTimeInfo(lat, lon);
    return {
      ...airport,
      ...timeInfo
    };
  },

  /**
   * Convert time between two locations (IATA codes or cities)
   */
  async convertTimeBetweenAirports(fromIata, toIata, utcTime = null) {
    const airports = await this.loadAirports();
    const fromAirport = airports.find(a => a.iata === fromIata);
    const toAirport = airports.find(a => a.iata === toIata);

    if (!fromAirport || !toAirport) return null;

    const fromTz = getTimezoneFromCoords(parseFloat(fromAirport.latitude), parseFloat(fromAirport.longitude));
    const toTz = getTimezoneFromCoords(parseFloat(toAirport.latitude), parseFloat(toAirport.longitude));

    if (!fromTz || !toTz) return null;

    const time = utcTime ? new Date(utcTime) : new Date();
    
    const fromInfo = convertToLocal(time, fromTz);
    const toInfo = convertToLocal(time, toTz);

    return {
      departure: {
        ...fromAirport,
        ...fromInfo
      },
      arrival: {
        ...toAirport,
        ...toInfo
      },
      requestedUtc: time.toISOString()
    };
  }
};
