/**
 * @file server.js
 * @description EcoTrace API entry point.
 *
 * Responsible for:
 *  - Loading environment variables via dotenv
 *  - Starting the HTTP server on the configured port
 *  - Handling graceful shutdown on SIGTERM / SIGINT so Railway
 *    can restart containers without dropping in-flight requests
 */

import 'dotenv/config';
import app from './app.js';

/** @constant {number} Default port when PORT env var is not set */
const DEFAULT_PORT = 3001;

/** @constant {number} Resolved port the server will listen on */
const PORT = Number(process.env.PORT) || DEFAULT_PORT;

const server = app.listen(PORT, () => {
  console.info(`[EcoTrace API] Server running on port ${PORT}`);
  console.info(`[EcoTrace API] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

/**
 * Performs a graceful shutdown: stops accepting new connections,
 * waits for existing ones to finish, then exits the process.
 *
 * @param {string} signal - The OS signal that triggered the shutdown
 * @returns {void}
 */
const shutdown = (signal) => {
  console.info(`\n[EcoTrace API] ${signal} received — shutting down gracefully`);

  server.close(() => {
    console.info('[EcoTrace API] All connections closed — process exiting');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
