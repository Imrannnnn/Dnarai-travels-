import { jest } from '@jest/globals';

jest.unstable_mockModule('fs/promises', () => ({
  default: {
    readFile: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/timeZoneHelper.js', () => ({
  getTimeInfo: jest.fn(),
  convertToLocal: jest.fn(),
  getTimezoneFromCoords: jest.fn(),
}));

const { TimeService } = await import('./TimeService.js');
const { default: fs } = await import('fs/promises');
const tzHelper = await import('../utils/timeZoneHelper.js');

describe('Time Service', () => {
  const mockAirports = [
    { city: 'Lagos', country: 'Nigeria', iata: 'LOS', latitude: '6.577', longitude: '3.321', airport_name: 'Murtala Muhammed International Airport' },
    { city: 'London', country: 'United Kingdom', iata: 'LHR', latitude: '51.470', longitude: '-0.454', airport_name: 'London Heathrow Airport' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFile.mockResolvedValue(JSON.stringify(mockAirports));
  });

  describe('loadAirports', () => {
    it('should read airports file and return parsed JSON data', async () => {
      const data = await TimeService.loadAirports();
      expect(data).toHaveLength(2);
      expect(data[0].iata).toBe('LOS');
      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('searchAirports', () => {
    it('should return empty list if query length is less than 2', async () => {
      const results = await TimeService.searchAirports('a');
      expect(results).toEqual([]);
    });

    it('should find airport by exact IATA code match', async () => {
      const results = await TimeService.searchAirports('LOS');
      expect(results).toHaveLength(1);
      expect(results[0].city).toBe('Lagos');
    });

    it('should find airport by partial city name match', async () => {
      const results = await TimeService.searchAirports('lond');
      expect(results).toHaveLength(1);
      expect(results[0].iata).toBe('LHR');
    });
  });

  describe('getAirportTime', () => {
    it('should return null if airport is not found', async () => {
      const result = await TimeService.getAirportTime('XYZ');
      expect(result).toBeNull();
    });

    it('should return airport details and timeInfo if found', async () => {
      const mockTimeInfo = {
        timezone: 'Africa/Lagos',
        localTime: '12:00',
        localTime12: '12:00 PM',
        utcOffset: '+01:00',
      };
      tzHelper.getTimeInfo.mockReturnValue(mockTimeInfo);

      const result = await TimeService.getAirportTime('LOS');
      expect(result).toEqual(
        expect.objectContaining({
          iata: 'LOS',
          timezone: 'Africa/Lagos',
          localTime: '12:00',
        })
      );
      expect(tzHelper.getTimeInfo).toHaveBeenCalledWith(6.577, 3.321);
    });
  });

  describe('convertTimeBetweenAirports', () => {
    it('should return null if departure or arrival airport is not found', async () => {
      const result = await TimeService.convertTimeBetweenAirports('LOS', 'XYZ');
      expect(result).toBeNull();
    });

    it('should convert time between departure and arrival airports', async () => {
      tzHelper.getTimezoneFromCoords
        .mockReturnValueOnce('Africa/Lagos')
        .mockReturnValueOnce('Europe/London');

      tzHelper.convertToLocal
        .mockReturnValueOnce({ localTime: '10:00', timezone: 'Africa/Lagos' })
        .mockReturnValueOnce({ localTime: '09:00', timezone: 'Europe/London' });

      const result = await TimeService.convertTimeBetweenAirports('LOS', 'LHR', '2026-06-15T09:00:00Z');

      expect(result.departure.iata).toBe('LOS');
      expect(result.departure.localTime).toBe('10:00');
      expect(result.arrival.iata).toBe('LHR');
      expect(result.arrival.localTime).toBe('09:00');
    });
  });
});
