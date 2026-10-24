import axios from 'axios';

/**
 * WeatherService
 * Powered by Open-Meteo (No API Key required)
 */
export const WeatherService = {
  /**
   * Translates temperature and description into actionable clothing advice.
   */
  getClothingAdvice(tempC) {
    // Temperature-based advice

    if (tempC <= 0) {
      return "Extremely cold. Wear a heavy thermal coat, gloves, a scarf, and a hat. Layering is essential.";
    } else if (tempC > 0 && tempC <= 10) {
      return "Cold weather. A warm winter jacket or heavy coat is recommended. Wear sweaters or thermal layers underneath.";
    } else if (tempC > 10 && tempC <= 18) {
      return "Cool breeze. A light jacket, trench coat, or heavy sweater should be perfect for your comfort.";
    } else if (tempC > 18 && tempC <= 25) {
      return "Mild and pleasant. A light sweater, cardigans, or long-sleeve shirts are ideal.";
    } else if (tempC > 25 && tempC <= 32) {
      return "Warm weather. Lightweight cotton clothing like t-shirts, linens, and shorts will keep you cool.";
    } else {
      return "Very hot. Stick to loose, breathable fabrics. Stay hydrated and consider a hat for sun protection.";
    }
  },

  /**
   * Maps weather codes to descriptions and types.
   * Based on WMO Weather interpretation codes (WW)
   */
  interpretWeatherCode(code) {
    const map = {
      0: { desc: 'Clear sky', type: 'sun' },
      1: { desc: 'Mainly clear', type: 'sun' },
      2: { desc: 'Partly cloudy', type: 'cloudSun' },
      3: { desc: 'Overcast', type: 'cloud' },
      45: { desc: 'Foggy', type: 'cloud' },
      48: { desc: 'Depositing rime fog', type: 'cloud' },
      51: { desc: 'Light drizzle', type: 'rain' },
      53: { desc: 'Moderate drizzle', type: 'rain' },
      55: { desc: 'Dense drizzle', type: 'rain' },
      61: { desc: 'Slight rain', type: 'rain' },
      63: { desc: 'Moderate rain', type: 'rain' },
      65: { desc: 'Heavy rain', type: 'rain' },
      71: { desc: 'Slight snow', type: 'snow' },
      73: { desc: 'Moderate snow', type: 'snow' },
      75: { desc: 'Heavy snow', type: 'snow' },
      95: { desc: 'Thunderstorm', type: 'storm' },
    };
    return map[code] || { desc: 'Fair', type: 'cloudSun' };
  },

  async getCityForecast({ city, date }) {
    try {
      // 1. Get Coordinates via Geocoding API
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoRes = await axios.get(geoUrl);

      if (!geoRes.data.results || geoRes.data.results.length === 0) {
        throw new Error(`Location not found: ${city}`);
      }

      const { latitude, longitude, name } = geoRes.data.results[0];

      // 2. Get Weather via Forecast API (fetching 16 days daily forecast + current weather)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast`;
      const { data } = await axios.get(weatherUrl, {
        params: {
          latitude,
          longitude,
          current_weather: true,
          daily: 'temperature_2m_max,weathercode',
          timezone: 'auto',
          forecast_days: 16
        }
      });

      let tempC = 22;
      let weatherCode = 0;
      let usedForecastDay = false;

      let targetDateStr = null;
      if (date) {
        try {
          targetDateStr = new Date(date).toISOString().split('T')[0];
        } catch (e) {
          console.warn(`[WeatherService] Invalid date passed: ${date}`);
        }
      }

      if (targetDateStr && data.daily && data.daily.time) {
        const index = data.daily.time.indexOf(targetDateStr);
        if (index !== -1) {
          tempC = Math.round(data.daily.temperature_2m_max[index]);
          weatherCode = data.daily.weathercode[index];
          usedForecastDay = true;
        }
      }

      // Fallback to current weather if target date is not in the forecast window
      if (!usedForecastDay) {
        const current = data.current_weather || (data.daily && {
          temperature: data.daily.temperature_2m_max[0],
          weathercode: data.daily.weathercode[0]
        });
        if (current) {
          tempC = Math.round(current.temperature);
          weatherCode = current.weathercode;
        }
      }

      const { desc, type } = this.interpretWeatherCode(weatherCode);

      // 3. Generate Advice
      const advice = this.getClothingAdvice(tempC);

      return {
        tempC,
        desc,
        type,
        advice,
        location: name,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Weather check failed for ${city}:`, error.message);
      // Fallback data
      return {
        tempC: 22,
        desc: 'Sunny intervals',
        type: 'cloudSun',
        advice: "A light sweater or comfortable shirt should be perfect for current conditions.",
        location: city
      };
    }
  },

  cToF(c) {
    return Math.round((c * 9) / 5 + 32);
  },

  generateAutomatedWeatherSummary({
    tempMaxC = 32,
    tempMinC = 21,
    apparentTempMaxC = 35,
    rainProb = 50,
    weatherCode = 95,
    windGustsMph = 25,
    humidity = 78,
  }) {
    const highF = this.cToF(tempMaxC);
    const lowF = this.cToF(tempMinC);
    const apparentF = this.cToF(apparentTempMaxC);

    let thermalFeel = 'Warm and pleasant';
    let tempBand = `Highs around ${highF}°F/${tempMaxC}°C`;

    if (highF >= 90) {
      thermalFeel = humidity > 60 ? 'Hot and highly humid' : 'Hot and sunny';
      tempBand = `Highs in the lower 90s°F/${tempMaxC - 1}°C–${tempMaxC}°C`;
    } else if (highF >= 80) {
      thermalFeel = humidity > 65 ? 'Warm with noticeable humidity' : 'Warm and pleasantly sunny';
      tempBand = `Highs around the lower-to-mid 80s°F/${tempMaxC - 1}°C–${tempMaxC + 1}°C`;
    } else if (highF >= 65) {
      thermalFeel = 'Mild and comfortably pleasant';
      tempBand = `Highs in the 70s°F/${tempMaxC - 1}°C–${tempMaxC + 1}°C`;
    } else if (highF >= 50) {
      thermalFeel = 'Cool and crisp with fresh air';
      tempBand = `Highs in the 50s–60s°F/${tempMaxC - 1}°C–${tempMaxC + 1}°C`;
    } else {
      thermalFeel = 'Cold winter conditions';
      tempBand = `Highs near ${highF}°F/${tempMaxC}°C`;
    }

    let heatIndexPhrase = '';
    if (apparentF >= 98 && apparentF > highF + 3) {
      heatIndexPhrase = `, heat index up to ${apparentF}°F`;
    }

    let skyPhrase = 'mostly sunny skies';
    if ([95, 96, 99].includes(weatherCode) || (rainProb >= 40 && highF >= 80)) {
      skyPhrase = `mostly sunny skies turning to a ${rainProb || 50}% chance of afternoon thunderstorms`;
    } else if (rainProb >= 50) {
      skyPhrase = `overcast skies with a ${rainProb}% chance of steady rain showers`;
    } else if (rainProb >= 30) {
      skyPhrase = `partly cloudy skies with an isolated ${rainProb}% chance of brief showers`;
    } else {
      skyPhrase = 'abundant sunshine and clear skies';
    }

    let windPhrase = windGustsMph >= 20 ? ` and breezy conditions (gusts up to ${windGustsMph} mph)` : ' with light breezes';
    const overnightPhrase = `Overnight lows will cool down to ${Math.max(0, lowF - 4)}°F–${lowF + 3}°F.`;

    return `${thermalFeel} (${tempBand}${heatIndexPhrase}) with ${skyPhrase}${windPhrase}. ${overnightPhrase}`;
  },

  generateAutomatedClothingAdvice({
    tempMaxC = 32,
    tempMinC = 21,
    rainProb = 50,
    weatherCode = 95,
  }) {
    const highF = this.cToF(tempMaxC);
    const lowF = this.cToF(tempMinC);

    let daytime = 'Wear loose, lightweight, breathable fabrics for the daytime heat';
    if (highF < 70) daytime = 'Wear warm knit sweaters, long trousers, and comfortable walking shoes';
    else if (highF < 80) daytime = 'Opt for comfortable, lightweight cottons or breathable short-sleeve layers';

    let rain = '';
    if ([95, 96, 99].includes(weatherCode) || rainProb >= 40) {
      rain = ', carry a packable rain layer for afternoon storms';
    } else if (rainProb >= 25) {
      rain = ', carry a compact umbrella or lightweight water-resistant layer';
    }

    let ac = ', and keep a light jacket for chilly indoor AC and cooler evening lows.';
    if (lowF < 50) ac = ', and have a medium-weight coat ready for the cold evening hours.';

    return `${daytime}${rain}${ac}`;
  },

  async getTravelTipForecast({ city = 'Houston', iata = 'IAH', date = null, airportName = '', state = '' }) {
    const base = await this.getCityForecast({ city, date });
    const weatherSummary = this.generateAutomatedWeatherSummary({
      tempMaxC: base.tempC,
      tempMinC: Math.max(10, base.tempC - 11),
      apparentTempMaxC: base.tempC + 4,
      rainProb: 50,
      weatherCode: 95,
      windGustsMph: 25,
      humidity: 78
    });
    const clothingAdvice = this.generateAutomatedClothingAdvice({
      tempMaxC: base.tempC,
      tempMinC: Math.max(10, base.tempC - 11),
      rainProb: 50,
      weatherCode: 95
    });

    return {
      iata: (iata || 'IAH').toUpperCase(),
      city: city || base.location,
      airportName,
      state,
      date,
      weatherSummary,
      clothingAdvice,
      tempC: base.tempC,
      tempF: this.cToF(base.tempC)
    };
  }
};
