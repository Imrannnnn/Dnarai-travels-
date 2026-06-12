import { jest } from '@jest/globals';

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  User: {
    findById: jest.fn(),
  },
}));

const { requireAuth, requireRole } = await import('./authJwt.js');
const { default: jwt } = await import('jsonwebtoken');
const { User } = await import('../models/User.js');

describe('Auth JWT Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 if Authorization header is missing', async () => {
      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Missing Bearer token',
        })
      );
    });

    it('should return 401 if Authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Token my-token';
      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Missing Bearer token',
        })
      );
    });

    it('should return 401 if token validation fails', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        })
      );
    });

    it('should return 401 with TokenExpiredError if token is expired', async () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementationOnce(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'TOKEN_EXPIRED',
          message: 'Token expired',
        })
      );
    });

    it('should return 401 if user is not found in database', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-id-123' });
      User.findById.mockResolvedValue(null);

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'User not found',
        })
      );
    });

    it('should return 401 if user session expired due to server-side inactivity', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-id-123' });
      
      const mockUser = {
        _id: 'user-id-123',
        lastActivity: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago (exceeds 30 mins)
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockUser);

      await requireAuth(req, res, next);
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.save).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          code: 'SESSION_EXPIRED',
          message: 'Session expired due to inactivity',
        })
      );
    });

    it('should authorize and update activity if valid token and active user', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-id-123', role: 'passenger' });

      const mockUser = {
        _id: 'user-id-123',
        lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockUser);

      await requireAuth(req, res, next);
      expect(req.user).toEqual({ sub: 'user-id-123', role: 'passenger' });
      expect(mockUser.save).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole', () => {
    it('should allow request if user role is permitted', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole(['admin', 'agent']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should return 403 if user role is not permitted', () => {
      req.user = { role: 'passenger' };
      const middleware = requireRole(['admin', 'agent']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        })
      );
    });

    it('should return 403 if user role is missing', () => {
      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Missing role',
        })
      );
    });
  });
});
