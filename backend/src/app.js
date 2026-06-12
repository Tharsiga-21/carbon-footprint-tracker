/**
 * @file app.js
 * @description Express application factory.
 *
 * Wires all middleware and routers in the correct order.
 * Contains zero business logic — pure HTTP infrastructure only.
 * Exported separately from server.js so tests can import the app
 * without actually binding to a port.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
// helmet sets a suite of HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
// that protect against common web vulnerabilities out of the box.
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Only allow requests from explicitly whitelisted frontend origins.
// The allowlist is driven by the ALLOWED_ORIGINS env var so it can differ
// between local development and production without code changes.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    /**
     * Validates the request Origin header against the allowlist.
     * Non-browser requests (curl, supertest) pass no Origin and are allowed
     * through so tests and health checks are not blocked.
     *
     * @param {string|undefined} origin - The request's Origin header value
     * @param {Function} callback       - CORS callback(error, allowed)
     */
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' is not permitted by the CORS policy`));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
// 32 kb limit prevents oversized payload attacks while comfortably
// accommodating a full conversation history of ~50 messages.
app.use(express.json({ limit: '32kb' }));

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Applied only to /api/* so the /health endpoint is always reachable
// by Railway's health checker, even under heavy load.
app.use('/api/', rateLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/chat', chatRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
// Must be registered after all valid routes so it only fires for
// paths that no router claimed.
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must be the LAST middleware — Express identifies it by its 4-argument
// signature (err, req, res, next).
app.use(errorHandler);

export default app;
