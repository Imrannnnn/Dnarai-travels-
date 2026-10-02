import { resolveStateName } from './travelCardTime'

describe('Travel Card State Name Resolution', () => {
  it('should prioritize explicit state if provided', () => {
    expect(resolveStateName({ state: 'Lagos State', city: 'Lagos', iata: 'LOS' })).toBe('Lagos State')
    expect(resolveStateName({ state: 'Rivers State', iata: 'PHC' })).toBe('Rivers State')
  })

  it('should resolve Nigerian states from IATA codes', () => {
    expect(resolveStateName({ iata: 'LOS' })).toBe('Lagos')
    expect(resolveStateName({ iata: 'ABV' })).toBe('Abuja')
    expect(resolveStateName({ iata: 'PHC' })).toBe('Rivers')
    expect(resolveStateName({ iata: 'KAN' })).toBe('Kano')
    expect(resolveStateName({ iata: 'ENU' })).toBe('Enugu')
    expect(resolveStateName({ iata: 'CBQ' })).toBe('Cross River')
    expect(resolveStateName({ iata: 'BNI' })).toBe('Edo')
    expect(resolveStateName({ iata: 'QRW' })).toBe('Delta')
  })

  it('should resolve international states/regions from IATA codes', () => {
    expect(resolveStateName({ iata: 'LHR' })).toBe('London')
    expect(resolveStateName({ iata: 'JFK' })).toBe('New York')
    expect(resolveStateName({ iata: 'ATL' })).toBe('Georgia')
    expect(resolveStateName({ iata: 'DFW' })).toBe('Texas')
    expect(resolveStateName({ iata: 'DXB' })).toBe('Dubai')
    expect(resolveStateName({ iata: 'CDG' })).toBe('Paris')
  })

  it('should resolve state from city names and formatted city strings', () => {
    expect(resolveStateName({ city: 'Lagos, Nigeria' })).toBe('Lagos')
    expect(resolveStateName({ city: 'Abuja, Nigeria' })).toBe('Abuja')
    expect(resolveStateName({ city: 'Port Harcourt' })).toBe('Rivers')
    expect(resolveStateName({ city: 'Dallas, Texas' })).toBe('Texas')
    expect(resolveStateName({ city: 'Houston, TX' })).toBe('Texas')
    expect(resolveStateName({ city: 'London, UK' })).toBe('London')
  })

  it('should handle placeholders and return fallback', () => {
    expect(resolveStateName({ city: 'Departure City', fallback: 'DEP' })).toBe('DEP')
    expect(resolveStateName({ city: 'Arrival City', fallback: 'ARR' })).toBe('ARR')
    expect(resolveStateName({ city: '', fallback: 'DEP' })).toBe('DEP')
    expect(resolveStateName({ fallback: 'DEP' })).toBe('DEP')
  })
})
