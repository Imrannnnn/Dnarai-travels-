export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const pathName = firstError.path.slice(1).join('.');
      const message = pathName ? `${pathName}: ${firstError.message}` : firstError.message;
      return next({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: message,
        details: parsed.error.flatten(),
      });
    }

    req.validated = parsed.data;
    return next();
  };
}
