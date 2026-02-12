export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (status >= 500) {
    console.error('[backend] error', err);
  }

  res.status(status).json({
    code,
    message: err.message || 'Something went wrong',
    details: err.details || undefined,
  });
}
