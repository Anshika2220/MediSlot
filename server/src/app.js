// server/src/app.js
// Express application factory.
// Registers middleware and routes. Does NOT call listen() —
// that lives in server.js so tests can import app without starting a real port.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import healthRouter from './routes/health.js';
import authRouter from './routes/authRoutes.js';
import doctorRouter from './routes/doctorRoutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/appointments', appointmentRouter);

// DB ping endpoint
app.get('/api/ping', (req, res) => res.json({ pong: true, ts: Date.now() }));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// ── Central error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
