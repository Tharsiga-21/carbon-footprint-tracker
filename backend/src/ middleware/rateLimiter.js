/**
 * @file middleware/rateLimiter.js
 * @description Express rate-limiting middleware for the /api/* prefix.
 *
 * Limits each IP address to MAX_REQUESTS_PER_WINDOW requests within
 * WINDOW_DURATION_MS to:
 *  - Prevent accidental runaway loops from the frontend
 *  - Protect against abuse that would generate unexpected Anthropic API costs
 *  - Provide a basic denial-of-service mitigation layer
 *
 * 30 requests per minute is generous for interactive chat usage while
 * still providing meaningful protection.
 */

import rateLimit from 'express-rate-limit';

/** @constant {number} Rolling time window duration in milliseconds (1 minute) */
const WINDOW_DURATION_MS = 60 * 1000;

/** @constant {number} Maximum requests allowed per IP within the window */
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * Rate limiter middleware instance.
 *
 * Uses the RateLimit-* standard headers (RFC draft) rather than the
 * legacy X-RateLimit-* headers so clients get accurate retry-after info.
 *
 * @type {import('express').RequestHandler}
 */
export const rateLimiter = rateLimit({
  windowMs:        WINDOW_DURATION_MS,
  max:             MAX_REQUESTS_PER_WINDOW,
  standardHeaders: true,   // Return RateLimit-* headers per RFC draft
  legacyHeaders:   false,  // Disable X-RateLimit-* headers
  message: {
    error: 'Too many requests — please wait a moment before sending another message.',
  },
});
