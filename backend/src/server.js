import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDb } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import passengerRoutes from './routes/passengers.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import portalRoutes from './routes/portal.routes.js';
import agencyRoutes from './routes/agency.routes.js';
import demoRoutes from './routes/demo.routes.js';

import { startSchedulers } from './jobs/scheduler.js';
import { EmailParserService } from './services/EmailParserService.js';

dotenv.config();

const app = express();

app.use(helmet());

// ---------- CORS Setup ----------
const allowedOrigins = [
  'http://localhost:5173',                  // local dev
  'https://dnaraitravels.netlify.app'      // deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests (Postman, cron jobs)
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
// --------------------------------

app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/agency', agencyRoutes);

if (process.env.PUBLIC_DEMO === 'true') {
  app.use('/', demoRoutes);
}

app.use(errorHandler);

async function main() {
  await connectDb();
  startSchedulers();
  EmailParserService.init();

  const PORT = process.env.PORT || 5000; // fallback for local dev
  app.listen(PORT, () => {
    console.log(`[backend] listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[backend] fatal error', err);
  process.exit(1);
});
