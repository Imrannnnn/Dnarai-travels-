import { useMemo } from 'react'
import { notifications } from './mockData'

export function useUnreadCount() {
  return useMemo(() => notifications.filter((n) => n.unread).length, [])
}
