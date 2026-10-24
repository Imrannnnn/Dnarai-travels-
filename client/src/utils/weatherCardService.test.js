import {
  cToF,
  fToC,
  formatDateReadable,
  interpretWmoCode,
  generateAutomatedWeatherSummary,
  generateAutomatedClothingAdvice,
  getSeasonalClimateFallback,
  fetchWeatherTipData,
} from './weatherCardService'

describe('weatherCardService', () => {
  describe('Temperature conversions', () => {
    it('converts Celsius to Fahrenheit correctly', () => {
      expect(cToF(0)).toBe(32)
      expect(cToF(32)).toBe(90)
      expect(cToF(100)).toBe(212)
    })

    it('converts Fahrenheit to Celsius correctly', () => {
      expect(fToC(32)).toBe(0)
      expect(fToC(90)).toBe(32)
      expect(fToC(212)).toBe(100)
    })
  })

  describe('formatDateReadable', () => {
    it('formats ISO date strings without UTC shift', () => {
      const formatted = formatDateReadable('2026-10-15')
      expect(formatted).toContain('October 15, 2026')
    })
  })

  describe('interpretWmoCode', () => {
    it('maps weather codes to descriptive summaries', () => {
      expect(interpretWmoCode(0).short).toBe('Clear')
      expect(interpretWmoCode(95).short).toBe('Thunderstorms')
      expect(interpretWmoCode(61).short).toBe('Passing Showers')
    })
  })

  describe('generateAutomatedWeatherSummary', () => {
    it('produces the expected Houston high heat and afternoon storm summary structure', () => {
      const summary = generateAutomatedWeatherSummary({
        tempMaxC: 33,
        tempMinC: 20,
        apparentTempMaxC: 41, // 105F
        rainProb: 50,
        weatherCode: 95,
        windSpeedMph: 15,
        windGustsMph: 25,
        humidity: 78,
      })

      expect(summary).toContain('Hot and highly humid')
      expect(summary).toContain('Highs in the lower 90s°F')
      expect(summary).toContain('heat index up to 106°F')
      expect(summary).toContain('50% chance of afternoon thunderstorms')
      expect(summary).toContain('gusts up to 25 mph')
      expect(summary).toContain('Overnight lows will cool down to')
    })
  })

  describe('generateAutomatedClothingAdvice', () => {
    it('produces the expected breathable fabrics, rain layer, and light jacket advice', () => {
      const advice = generateAutomatedClothingAdvice({
        tempMaxC: 32,
        tempMinC: 20,
        rainProb: 50,
        weatherCode: 95,
        windGustsMph: 25,
      })

      expect(advice).toContain('Wear loose, lightweight, breathable fabrics for the daytime heat')
      expect(advice).toContain('carry a packable rain layer for afternoon storms')
      expect(advice).toContain('keep a light jacket for chilly indoor AC and cooler evening lows')
    })
  })

  describe('getSeasonalClimateFallback', () => {
    it('provides tailored October profile for Houston (IAH)', () => {
      const fallback = getSeasonalClimateFallback({ iata: 'IAH', dateStr: '2026-10-15' })
      expect(fallback.tempMaxC).toBe(32)
      expect(fallback.rainProb).toBe(50)
      expect(fallback.weatherCode).toBe(95)
      expect(fallback.windGustsMph).toBe(25)
    })
  })

  describe('fetchWeatherTipData', () => {
    it('generates a complete tip payload with metrics, summary, and advice', async () => {
      const tip = await fetchWeatherTipData({
        city: 'Houston',
        iata: 'IAH',
        airportName: 'George Bush Intercontinental Airport',
        state: 'TX',
        dateStr: '2026-10-15',
      })

      expect(tip.iata).toBe('IAH')
      expect(tip.city).toBe('Houston')
      expect(tip.dateFormatted).toBe('October 15, 2026')
      expect(tip.weatherSummary).toBeTruthy()
      expect(tip.clothingAdvice).toBeTruthy()
      expect(tip.metrics.highTempF).toBeGreaterThanOrEqual(85)
    })
  })
})
