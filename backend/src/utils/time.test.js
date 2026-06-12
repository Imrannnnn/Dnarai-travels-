import { to12Hour, timePeriod } from './time.js';

describe('Backend Time Utility', () => {
  describe('to12Hour', () => {
    it('should convert morning times correctly', () => {
      expect(to12Hour('09:30')).toBe('9:30 AM');
      expect(to12Hour('00:15')).toBe('12:15 AM');
      expect(to12Hour('12:00')).toBe('12:00 PM');
    });

    it('should convert afternoon and evening times correctly', () => {
      expect(to12Hour('14:45')).toBe('2:45 PM');
      expect(to12Hour('23:59')).toBe('11:59 PM');
    });
  });

  describe('timePeriod', () => {
    it('should return Morning for times between 05:00 and 11:59', () => {
      expect(timePeriod('05:00')).toBe('Morning');
      expect(timePeriod('08:30')).toBe('Morning');
      expect(timePeriod('11:59')).toBe('Morning');
    });

    it('should return Afternoon for times between 12:00 and 16:59', () => {
      expect(timePeriod('12:00')).toBe('Afternoon');
      expect(timePeriod('14:15')).toBe('Afternoon');
      expect(timePeriod('16:59')).toBe('Afternoon');
    });

    it('should return Evening for times between 17:00 and 20:59', () => {
      expect(timePeriod('17:00')).toBe('Evening');
      expect(timePeriod('19:45')).toBe('Evening');
      expect(timePeriod('20:59')).toBe('Evening');
    });

    it('should return Night for other times', () => {
      expect(timePeriod('21:00')).toBe('Night');
      expect(timePeriod('23:30')).toBe('Night');
      expect(timePeriod('04:59')).toBe('Night');
    });
  });
});
