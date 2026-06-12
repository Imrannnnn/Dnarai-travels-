import { jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from './validate.js';

describe('Validation Middleware', () => {
  const schema = z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      age: z.number().min(18, 'Must be at least 18'),
    }),
  });

  it('should call next with no arguments if validation succeeds', () => {
    const req = {
      body: { email: 'test@example.com', age: 25 },
      query: {},
      params: {},
    };
    const res = {};
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.validated).toEqual({
      body: { email: 'test@example.com', age: 25 },
    });
  });

  it('should call next with a formatted validation error if validation fails', () => {
    const req = {
      body: { email: 'invalid-email', age: 15 },
      query: {},
      params: {},
    };
    const res = {};
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed).toBeDefined();
    expect(errorPassed.status).toBe(400);
    expect(errorPassed.code).toBe('VALIDATION_ERROR');
    expect(errorPassed.message).toContain('email');
    expect(errorPassed.details).toBeDefined();
  });
});
