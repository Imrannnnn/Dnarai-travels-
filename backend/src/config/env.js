import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skylink',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  DOC_ENCRYPTION_KEY_BASE64: process.env.DOC_ENCRYPTION_KEY_BASE64 || '',

  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '',
  WEATHER_API_BASE_URL:
    process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5',

  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',

  IMAP_HOST: process.env.IMAP_HOST || 'imap.gmail.com',
  IMAP_PORT: Number(process.env.IMAP_PORT || 993),
  IMAP_TLS: (process.env.IMAP_TLS || 'true') === 'true',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash',

  PUBLIC_DEMO: (process.env.PUBLIC_DEMO || 'false').toLowerCase() === 'true',


  //super - admin password

  EMAIL: process.env.EMAIL,
  SUPER_PASSWORD: process.env.SUPER_PASSWORD

};
