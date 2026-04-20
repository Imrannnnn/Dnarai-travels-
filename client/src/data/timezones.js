import ct from 'countries-and-timezones';

/**
 * A curated list of major world cities and their IANA timezone identifiers.
 * This list is used for the Global Time Converter feature.
 */
export const popularCities = [
  { city: "Lagos", country: "Nigeria", timezone: "Africa/Lagos" },
  { city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { city: "New York", country: "United States", timezone: "America/New_York" },
  { city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { city: "Paris", country: "France", timezone: "Europe/Paris" },
  { city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  { city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
  { city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { city: "Johnannesburg", country: "South Africa", timezone: "Africa/Johannesburg" },
  { city: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi" }
];

/**
 * Extensive alias map to help users search by state, province, or major cities
 * that aren't the primary identifier of a timezone.
 */
const timezoneAliases = {
  "America/Chicago": ["Texas", "Central Time (US)", "Illinois", "Houston", "Dallas", "Austin", "San Antonio", "Minnesota", "Wisconsin", "Missouri", "Tennessee", "Louisiana", "New Orleans", "OKC", "Oklahoma"],
  "America/Los_Angeles": ["California", "Pacific Time (US)", "Los Angeles", "San Francisco", "San Diego", "Seattle", "Washington State", "Nevada", "Las Vegas", "Portland", "Oregon"],
  "America/New_York": ["New York", "Eastern Time (US)", "Florida", "Miami", "Orlando", "Washington DC", "Atlanta", "Boston", "Philadelphia", "Ohio", "North Carolina", "Georgia", "Virginia", "Maryland", "New Jersey", "Pennsylvania"],
  "America/Denver": ["Mountain Time (US)", "Colorado", "Denver", "Utah", "Salt Lake City", "Montana", "Wyoming", "New Mexico", "El Paso (Texas)"],
  "America/Phoenix": ["Arizona", "Phoenix", "Tucson"],
  "America/Anchorage": ["Alaska", "Anchorage"],
  "Pacific/Honolulu": ["Hawaii", "Honolulu"],
  "Europe/London": ["UK", "England", "Scotland", "Wales", "Great Britain", "Manchester", "Birmingham"],
  "Asia/Dubai": ["UAE", "Abu Dhabi", "United Arab Emirates"],
  "America/Toronto": ["Ontario", "Montreal", "Quebec", "Ottawa"],
  "America/Vancouver": ["British Columbia", "BC", "Vancouver"],
  "Africa/Lagos": ["Abuja", "Kano", "Ibadan"],
  "Africa/Johannesburg": ["Pretoria", "Cape Town", "Durban", "SA", "South Africa"],
  "Asia/Shanghai": ["Beijing", "Guangzhou", "Shenzhen", "China"],
  "Europe/Paris": ["France", "Marseille", "Lyon"],
  "Europe/Berlin": ["Germany", "Munich", "Frankfurt", "Hamburg"],
  "Asia/Tokyo": ["Japan", "Osaka", "Kyoto", "Yokohama"],
  "Australia/Sydney": ["New South Wales", "NSW", "Canberra"],
  "Australia/Melbourne": ["Victoria"],
  "Australia/Brisbane": ["Queensland", "Gold Coast"],
  "Australia/Perth": ["Western Australia"]
};

/**
 * Returns a comprehensive list of all countries mapped to their timezones.
 * Each entry includes country name, city/region name, and IANA timezone ID.
 */
export const getFullCountryTimezoneData = () => {
  const countries = ct.getAllCountries();
  const allData = [];

  Object.values(countries).forEach(country => {
    const timezones = ct.getTimezonesForCountry(country.id);
    
    timezones.forEach(tz => {
      // Extract main city/region name from IANA ID (e.g. "Africa/Lagos" -> "Lagos")
      const parts = tz.name.split('/');
      const cityName = parts[parts.length - 1].replace(/_/g, ' ');

      // Base location entry
      allData.push({
        id: `${country.id}-${tz.name}-base`, 
        country: country.name,
        countryCode: country.id,
        city: cityName,
        timezone: tz.name,
        offset: tz.utcOffsetStr,
        dstOffset: tz.dstOffsetStr,
      });

      // Inject aliases as first-class primary entries!
      const aliases = timezoneAliases[tz.name] || [];
      aliases.forEach(aliasName => {
        allData.push({
          id: `${country.id}-${tz.name}-${aliasName.toLowerCase().replace(/\s+/g, '-')}`,
          country: country.name,
          countryCode: country.id,
          city: aliasName, // Present alias as the primary region/city!
          timezone: tz.name,
          offset: tz.utcOffsetStr,
          dstOffset: tz.dstOffsetStr,
        });
      });
    });
  });

  // Sort by country name primarily, then city
  return allData.sort((a, b) => {
    if (a.country < b.country) return -1;
    if (a.country > b.country) return 1;
    return a.city < b.city ? -1 : 1;
  });
};

/**
 * Helper to get unique countries for list/select purposes
 */
export const getUniqueCountries = () => {
    const countries = ct.getAllCountries();
    return Object.values(countries).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Helper to get timezones for a specific country
 */
export const getTimezonesByCountryCode = (code) => {
    return ct.getTimezonesForCountry(code);
};
