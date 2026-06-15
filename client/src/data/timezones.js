/**
 * A curated list of major world cities with their coordinates.
 * We use coordinates to derive the timezone dynamically using geo-tz on the backend.
 */
export const popularCities = [
  { city: "Lagos", country: "Nigeria", iata: "LOS", latitude: 6.577, longitude: 3.321 },
  { city: "London", country: "United Kingdom", iata: "LHR", latitude: 51.470, longitude: -0.454 },
  { city: "New York", country: "United States", iata: "JFK", latitude: 40.641, longitude: -73.778 },
  { city: "Dubai", country: "United Arab Emirates", iata: "DXB", latitude: 25.253, longitude: 55.365 },
  { city: "Paris", country: "France", iata: "CDG", latitude: 49.009, longitude: 2.547 },
  { city: "Singapore", country: "Singapore", iata: "SIN", latitude: 1.364, longitude: 103.991 },
  { city: "Sydney", country: "Australia", iata: "SYD", latitude: -33.939, longitude: 151.175 },
  { city: "Tokyo", country: "Japan", iata: "HND", latitude: 35.549, longitude: 139.779 },
  { city: "Johannesburg", country: "South Africa", iata: "JNB", latitude: -26.139, longitude: 28.246 },
  { city: "Nairobi", country: "Kenya", iata: "NBO", latitude: -1.319, longitude: 36.927 },
  { city: "Addis Ababa", country: "Ethiopia", iata: "ADD", latitude: 8.977, longitude: 38.799 },
  { city: "Mumbai", country: "India", iata: "BOM", latitude: 19.089, longitude: 72.868 },
  { city: "Beijing", country: "China", iata: "PEK", latitude: 40.079, longitude: 116.584 },
  { city: "São Paulo", country: "Brazil", iata: "GRU", latitude: -23.435, longitude: -46.473 },
  { city: "Toronto", country: "Canada", iata: "YYZ", latitude: 43.677, longitude: -79.624 },
  { city: "Cairo", country: "Egypt", iata: "CAI", latitude: 30.121, longitude: 31.405 },
  { city: "Istanbul", country: "Turkey", iata: "IST", latitude: 41.275, longitude: 28.751 }
];

/**
 * Stripped down helper to return popular cities as base data.
 * All other searches will go through the backend airport database.
 */
export const getFullCountryTimezoneData = () => {
  return popularCities.map(city => ({
    ...city,
    id: city.iata,
    timezone: '', // To be determined by backend
    offset: 'Live'
  }));
};
