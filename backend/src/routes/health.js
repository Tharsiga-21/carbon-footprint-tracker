/**
 * @file routes/health.js
 * @description Health check endpoint for deployment platforms.
 *
 * Railway (and other PaaS providers) poll this endpoint to determine
 * whether the container is alive and ready to serve traffic. It must:
 *  - Respond quickly (no database queries, no external calls)
 *  - Return a non-2xx status if the server is genuinely unhealthy
 *  - Confirm critical configuration (API key) is present without
 *    revealing the actual key value
 */

import { Router } from 'express';

const router = Router();

/**
 * ISO 8601 timestamp recorded once at module load time.
 * Used by operators to verify the container has not been silently restarted.
 *
 * @constant {string}
 */
const STARTED_AT = new Date().toISOString();

/**
 * GET /health
 *
 * Returns a JSON payload confirming the server is running.
 *
 * @name GET /health
 * @returns {{ status: 'ok', startedAt: string, apiKeySet: boolean }}
 *
 * @example
 * // 200 OK
 * { "status": "ok", "startedAt": "2025-01-01T00:00:00.000Z", "apiKeySet": true }
 */
router.get('/', (_req, res) => {
  res.json({
    status:    'ok',
    startedAt: STARTED_AT,
    // Boolean confirms the key is configured; never returns the key itself
    apiKeySet: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

export default router;
