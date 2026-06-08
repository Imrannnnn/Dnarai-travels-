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
};
