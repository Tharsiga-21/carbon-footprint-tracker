/**
 * @file middleware/errorHandler.js
 * @description Centralised Express error-handling middleware.
 *
 * Catches every error forwarded via next(err) from route handlers and
 * formats a consistent { error: string } JSON response.
 *
 * Rules:
 *  - Never expose internal stack traces or file paths to the client in production
 *  - Always return the same response shape: { error: string }
 *  - Log the full error server-side in development for easier debugging
 *  - Handle known error shapes (Anthropic SDK, CORS) with appropriate status codes
 */

/** @constant {boolean} True when running outside of a production environment */
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Express global error handler. Must be registered as the LAST middleware
 * in app.js — Express identifies it by its 4-argument signature.
 *
 * @param {Error}                    err  - The error forwarded by next(err)
 * @param {import('express').Request}  req  - Express request object (unused)
 * @param {import('express').Response} res  - Express response object
 * @param {import('express').NextFunction} next - Express next function (required for 4-arg signature)
 * @returns {void}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // ── Anthropic SDK errors ───────────────────────────────────────────────────
  // The SDK surfaces API errors with a numeric .status and an .error object.
  // Forward the upstream status code so the client can distinguish rate
  // limits (429) from auth failures (401) etc.
  if (err.status && err.error) {
    return res.status(err.status).json({
      error: err.error?.message ?? 'Upstream API error',
    });
  }

  // ── CORS policy violations ─────────────────────────────────────────────────
  // The CORS callback throws an Error whose message starts with "Origin".
  // Return 403 Forbidden with the reason so the caller knows it's a CORS issue.
  if (err.message?.startsWith("Origin '")) {
    return res.status(403).json({ error: err.message });
  }

  // ── All other errors ───────────────────────────────────────────────────────
  if (IS_DEV) {
    console.error('[EcoTrace API] Unhandled error:', err);
  } else {
    console.error('[EcoTrace API] Unhandled error:', err.message);
  }

  const statusCode = err.statusCode ?? err.status ?? 500;

  res.status(statusCode).json({
    error: IS_DEV
      ? err.message
      : 'An unexpected error occurred. Please try again.',
  });
}
