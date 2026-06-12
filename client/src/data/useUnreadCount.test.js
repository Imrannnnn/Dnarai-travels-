import { useUnreadCount } from './useUnreadCount';

jest.mock('react', () => ({
  useMemo: (fn) => fn(),
}));

jest.mock('./mockData', () => ({
  notifications: [
    { id: '1', message: 'Hello', unread: true },
    { id: '2', message: 'World', unread: false },
    { id: '3', message: 'Test', unread: true },
  ],
}));

describe('useUnreadCount Hook', () => {
  it('should return the correct count of unread notifications', () => {
    const count = useUnreadCount();
    expect(count).toBe(2);
  });
});
