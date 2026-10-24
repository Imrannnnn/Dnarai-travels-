import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn(),
  },
}));

const { WeatherService } = await import('./WeatherService.js');
const { default: axios } = await import('axios');

describe('Weather Service', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('getClothingAdvice', () => {
    it('should return advice for extremely cold temperatures', () => {
      expect(WeatherService.getClothingAdvice(-5)).toContain('Extremely cold');
      expect(WeatherService.getClothingAdvice(0)).toContain('Extremely cold');
    });

    it('should return advice for cold temperatures', () => {
      expect(WeatherService.getClothingAdvice(5)).toContain('Cold weather');
      expect(WeatherService.getClothingAdvice(10)).toContain('Cold weather');
    });

    it('should return advice for cool temperatures', () => {
      expect(WeatherService.getClothingAdvice(15)).toContain('Cool breeze');
      expect(WeatherService.getClothingAdvice(18)).toContain('Cool breeze');
    });

    it('should return advice for mild temperatures', () => {
      expect(WeatherService.getClothingAdvice(20)).toContain('Mild and pleasant');
      expect(WeatherService.getClothingAdvice(25)).toContain('Mild and pleasant');
    });

    it('should return advice for warm temperatures', () => {
      expect(WeatherService.getClothingAdvice(28)).toContain('Warm weather');
      expect(WeatherService.getClothingAdvice(32)).toContain('Warm weather');
    });

    it('should return advice for hot temperatures', () => {
      expect(WeatherService.getClothingAdvice(35)).toContain('Very hot');
    });
  });

  describe('interpretWeatherCode', () => {
    it('should translate clear sky code correctly', () => {
      expect(WeatherService.interpretWeatherCode(0)).toEqual({
        desc: 'Clear sky',
        type: 'sun',
      });
    });

    it('should translate rain code correctly', () => {
      expect(WeatherService.interpretWeatherCode(61)).toEqual({
        desc: 'Slight rain',
        type: 'rain',
      });
    });

    it('should fallback to default values for unknown code', () => {
      expect(WeatherService.interpretWeatherCode(999)).toEqual({
        desc: 'Fair',
        type: 'cloudSun',
      });
    });
  });

  describe('getCityForecast', () => {
    it('should fetch forecast successfully and return interpreted results', async () => {
      const mockGeoResponse = {
        data: {
          results: [
            {
              latitude: 6.577,
              longitude: 3.321,
              name: 'Lagos',
            },
          ],
        },
      };

      const mockWeatherResponse = {
        data: {
          current_weather: {
            temperature: 28,
            weathercode: 0,
          },
          daily: {
            time: ['2026-06-15'],
            temperature_2m_max: [30],
            weathercode: [1],
          },
        },
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('geocoding-api')) {
          return Promise.resolve(mockGeoResponse);
        }
        if (url.includes('forecast')) {
          return Promise.resolve(mockWeatherResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await WeatherService.getCityForecast({
        city: 'Lagos',
        date: '2026-06-15',
      });

      expect(result.tempC).toBe(30);
      expect(result.desc).toBe('Mainly clear');
      expect(result.type).toBe('sun');
      expect(result.location).toBe('Lagos');
      expect(result.advice).toContain('Warm weather');
    });

    it('should use fallback if coordinates search returns no results', async () => {
      axios.get.mockResolvedValueOnce({ data: { results: [] } });

      const result = await WeatherService.getCityForecast({
        city: 'UnknownCity',
        date: '2026-06-15',
      });

      expect(result.tempC).toBe(22);
      expect(result.desc).toBe('Sunny intervals');
      expect(result.location).toBe('UnknownCity');
    });
  });

  describe('generateAutomatedWeatherSummary', () => {
    it('generates rich summary with temperatures and sky conditions', () => {
      const summary = WeatherService.generateAutomatedWeatherSummary({
        tempMaxC: 33,
        tempMinC: 21,
        apparentTempMaxC: 40,
        rainProb: 50,
        weatherCode: 95,
        windGustsMph: 25,
        humidity: 78
      });

      expect(summary).toContain('Hot and highly humid');
      expect(summary).toContain('Highs in the lower 90s°F');
      expect(summary).toContain('50% chance of afternoon thunderstorms');
      expect(summary).toContain('gusts up to 25 mph');
      expect(summary).toContain('Overnight lows will cool down to');
    });
  });

  describe('generateAutomatedClothingAdvice', () => {
    it('generates practical clothing advice for warm climates', () => {
      const advice = WeatherService.generateAutomatedClothingAdvice({
        tempMaxC: 32,
        tempMinC: 21,
        rainProb: 50,
        weatherCode: 95
      });

      expect(advice).toContain('Wear loose, lightweight, breathable fabrics for the daytime heat');
      expect(advice).toContain('carry a packable rain layer for afternoon storms');
      expect(advice).toContain('keep a light jacket for chilly indoor AC and cooler evening lows');
    });
  });

  describe('getTravelTipForecast', () => {
    it('produces a full travel tip forecast payload', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          results: [{ latitude: 29.98, longitude: -95.34, name: 'Houston' }]
        }
      }).mockResolvedValueOnce({
        data: {
          daily: {
            time: ['2026-10-15'],
            temperature_2m_max: [32],
            weathercode: [95]
          }
        }
      });

      const tip = await WeatherService.getTravelTipForecast({
        city: 'Houston',
        iata: 'IAH',
        date: '2026-10-15'
      });

      expect(tip.iata).toBe('IAH');
      expect(tip.city).toBe('Houston');
      expect(tip.weatherSummary).toBeTruthy();
      expect(tip.clothingAdvice).toBeTruthy();
    });
  });
});
