import { convertTo12Hour, getTimePeriod } from './time'

describe('Client Time Utility', () => {
  describe('convertTo12Hour', () => {
    it('should convert morning times correctly', () => {
      expect(convertTo12Hour('09:30')).toBe('9:30 AM')
      expect(convertTo12Hour('00:15')).toBe('12:15 AM')
      expect(convertTo12Hour('12:00')).toBe('12:00 PM')
    });

    it('should convert afternoon and evening times correctly', () => {
      expect(convertTo12Hour('14:45')).toBe('2:45 PM')
      expect(convertTo12Hour('23:59')).toBe('11:59 PM')
    });
  });

  describe('getTimePeriod', () => {
    it('should return Morning for times between 05:00 and 11:59', () => {
      expect(getTimePeriod('05:00')).toBe('Morning')
      expect(getTimePeriod('08:30')).toBe('Morning')
      expect(getTimePeriod('11:59')).toBe('Morning')
    });

    it('should return Afternoon for times between 12:00 and 16:59', () => {
      expect(getTimePeriod('12:00')).toBe('Afternoon')
      expect(getTimePeriod('14:15')).toBe('Afternoon')
      expect(getTimePeriod('16:59')).toBe('Afternoon')
    });

    it('should return Evening for times between 17:00 and 20:59', () => {
      expect(getTimePeriod('17:00')).toBe('Evening')
      expect(getTimePeriod('19:45')).toBe('Evening')
      expect(getTimePeriod('20:59')).toBe('Evening')
    });

    it('should return Night for other times', () => {
      expect(getTimePeriod('21:00')).toBe('Night')
      expect(getTimePeriod('23:30')).toBe('Night')
      expect(getTimePeriod('04:59')).toBe('Night')
    });
  });
});
