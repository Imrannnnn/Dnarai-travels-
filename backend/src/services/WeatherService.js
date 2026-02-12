import axios from 'axios';
import { env } from '../config/env.js';

// Minimal weather service using OpenWeather.
// For production, add caching (Redis/Mongo) and better geocoding.

export const WeatherService = {
  async getCityForecast({ city }) {
    if (!env.WEATHER_API_KEY) {
      return { tempC: 18, desc: 'Partly Cloudy', type: 'cloudSun' };
    }

    const url = `${env.WEATHER_API_BASE_URL}/weather`;
    const { data } = await axios.get(url, {
      params: {
        q: city,
        appid: env.WEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 6000,
    });

    const tempC = Math.round(data?.main?.temp);
    const desc = data?.weather?.[0]?.description || 'Forecast';

    const main = (data?.weather?.[0]?.main || '').toLowerCase();
    const type = main.includes('cloud') ? 'cloud' : main.includes('clear') ? 'sun' : 'cloudSun';

    return { tempC, desc, type };
  },
};
