/**
 * Global Express error handler.
 * Logs the error and returns a JSON-shaped error response.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  console.error(`[rpg-server] error (${status}):`, err.message);
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}
