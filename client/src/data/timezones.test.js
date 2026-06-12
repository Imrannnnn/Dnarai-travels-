import { popularCities, getFullCountryTimezoneData } from './timezones';

describe('Timezones configuration', () => {
  describe('popularCities', () => {
    it('should be an array of popular cities with coordinates', () => {
      expect(Array.isArray(popularCities)).toBe(true);
      expect(popularCities.length).toBeGreaterThan(0);
      expect(popularCities[0]).toHaveProperty('city');
      expect(popularCities[0]).toHaveProperty('country');
      expect(popularCities[0]).toHaveProperty('iata');
      expect(popularCities[0]).toHaveProperty('latitude');
      expect(popularCities[0]).toHaveProperty('longitude');
    });
  });

  describe('getFullCountryTimezoneData', () => {
    it('should map popular cities to timezone template objects', () => {
      const data = getFullCountryTimezoneData();
      expect(data).toHaveLength(popularCities.length);
      expect(data[0].id).toBe(popularCities[0].iata);
      expect(data[0].timezone).toBe('');
      expect(data[0].offset).toBe('Live');
    });
  });
});
