import { find } from 'geo-tz';
import { DateTime } from 'luxon';

/**
 * Get relative date label compared to current server time
 * @param {DateTime} targetDateTime 
 * @returns {string} 'Same Day', 'Next Day', 'Previous Day', etc.
 */
const getRelativeDateLabel = (targetDateTime) => {
  const now = DateTime.now().startOf('day');
  const target = targetDateTime.startOf('day');
  
  const diffInDays = Math.round(target.diff(now, 'days').days);
  
  if (diffInDays === 0) return 'Same Day';
  if (diffInDays === 1) return 'Next Day';
  if (diffInDays === -1) return 'Previous Day';
  
  return diffInDays > 0 ? `+${diffInDays} Days` : `${diffInDays} Days`;
};

/**
 * Get timezone and current local time for given coordinates.
 * @param {number} lat 
 * @param {number} lon 
 * @returns {object} { timezone, localTime, localTime12, utcOffset, relativeDate, fullDate }
 */
export const getTimeInfo = (lat, lon) => {
  try {
    const tzList = find(lat, lon);
    if (!tzList || tzList.length === 0) {
      return null;
    }

    const timezone = tzList[0];
    const now = DateTime.now().setZone(timezone);

    console.log(`[TimeHelper] Detected timezone ${timezone} for coordinates ${lat}, ${lon}`);

    return {
      timezone,
      localTime: now.toFormat('HH:mm'),
      localTime12: now.toFormat('h:mm a'),
      utcOffset: now.offsetNameShort || now.toFormat('ZZ'),
      relativeDate: getRelativeDateLabel(now),
      fullDate: now.toLocaleString(DateTime.DATETIME_MED),
      timestamp: now.toISO()
    };
  } catch (error) {
    console.error('Error in getTimeInfo:', error);
    return null;
  }
};

/**
 * Convert a specific UTC time to local time in a given timezone.
 * @param {string|Date} utcTime 
 * @param {string} timezone 
 * @returns {object}
 */
export const convertToLocal = (utcTime, timezone) => {
  try {
    const dt = DateTime.fromISO(new Date(utcTime).toISOString()).setZone(timezone);
    return {
      localTime: dt.toFormat('HH:mm'),
      localTime12: dt.toFormat('h:mm a'),
      relativeDate: getRelativeDateLabel(dt),
      fullDate: dt.toLocaleString(DateTime.DATETIME_MED),
      timezone: timezone,
      timestamp: dt.toISO()
    };
  } catch (error) {
    console.error('Error in convertToLocal:', error);
    return null;
  }
};

/**
 * Get timezone for coordinates
 * @param {number} lat 
 * @param {number} lon 
 * @returns {string|null}
 */
export const getTimezoneFromCoords = (lat, lon) => {
  try {
    const tzList = find(lat, lon);
    return tzList && tzList.length > 0 ? tzList[0] : null;
  } catch (error) {
    return null;
  }
};
