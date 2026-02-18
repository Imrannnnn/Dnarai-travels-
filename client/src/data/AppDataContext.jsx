import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchFlights, fetchNotifications, fetchPassenger, getApiBaseUrl, submitBookingRequest } from './api'
import { useAuth } from './AuthContext'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const { isAuthenticated, token } = useAuth()

  const [passenger, setPassenger] = useState(null)
  const [flights, setFlights] = useState([])
  const [notifications, setNotifications] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [overlay, setOverlay] = useState({ show: false, message: '', status: 'loading' })

  const abortRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setPassenger(null)
      setFlights([])
      setNotifications([])
      setDocuments([])
      return
    }

    const baseUrl = getApiBaseUrl()
    const controller = new AbortController()
    abortRef.current = controller

    async function load() {
      setLoading(true)
      try {
        const [p, f, n] = await Promise.all([
          fetchPassenger({ baseUrl, signal: controller.signal }),
          fetchFlights({ baseUrl, signal: controller.signal }),
          fetchNotifications({ baseUrl, signal: controller.signal }),
        ])

        if (p) {
          setPassenger({
            name: p.fullName || p.name,
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            membership: 'Premium Member', // Could come from backend
          })

          if (p.documentNumber) {
            setDocuments([{
              id: 'passport',
              icon: 'passport',
              title: 'International Passport',
              maskedNumber: '**** ' + p.documentNumber.slice(-4),
              expiry: new Date(p.documentExpiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              status: 'Verified'
            }])
          }
        }

        if (Array.isArray(f)) {
          setFlights(f.map(b => ({
            id: b._id,
            airline: b.airlineName,
            flightNumber: b.flightNumber,
            logoUrl: `https://picsum.photos/seed/${encodeURIComponent(b.airlineName)}/64/64`,
            status: b.status === 'updated' ? 'Updated' : 'On Time',
            date: new Date(b.departureDateTimeUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            fromCity: b.origin?.city,
            fromCode: b.origin?.iata,
            departTime24: b.departureTime24 || '00:00',
            toCity: b.destination?.city,
            toCode: b.destination?.iata,
            arriveTime24: '21:15',
            duration: '6h 45m',
            seat: '24A',
            bags: '2 Bags',
            weather: { label: `${b.destination?.city} Weather`, tempC: 18, desc: 'Partly Cloudy', type: 'cloudSun' },
          })))
        }

        if (Array.isArray(n)) {
          setNotifications(n.map(item => ({
            id: item._id,
            type: item.type === 'passport_alert' ? 'passport' : 'flight',
            title: item.type === 'passport_alert' ? 'Passport Alert' : 'Flight Update',
            message: item.message,
            timeAgo: 'Recently',
            unread: !item.read,
            actionLabel: 'View Details'
          })))
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [isAuthenticated, token])

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  )

  const addBooking = useCallback(async (booking) => {
    console.log('📋 AppDataContext: addBooking called with:', booking)
    const baseUrl = getApiBaseUrl()
    try {
      console.log('📋 Submitting booking request to API...')
      await submitBookingRequest({
        departureCity: booking.departureCity,
        destination: booking.destination,
        date: booking.date,
        isReturn: booking.isReturn,
        returnDate: booking.returnDate,
        passengers: booking.passengers,
        notes: booking.notes,
        baseUrl
      })
      console.log('📋 Booking request submitted, refreshing notifications...')
      // Optionally refresh notifications to show the confirmation
      const n = await fetchNotifications({ baseUrl })
      if (Array.isArray(n)) {
        setNotifications(n.map(item => ({
          id: item._id,
          type: item.type === 'passport_alert' ? 'passport' : 'flight',
          title: item.type === 'passport_alert' ? 'Passport Alert' : 'Flight Update',
          message: item.message,
          timeAgo: 'Recently',
          unread: !item.read,
          actionLabel: 'View Details'
        })))
      }
      console.log('📋 Notifications refreshed successfully')
    } catch (error) {
      console.error('📋 Failed to submit booking request:', error)
      throw error // Re-throw to let the modal handle it
    }
  }, [])

  const updatePassengerProfile = useCallback(async ({ fullName, phone }) => {
    const baseUrl = getApiBaseUrl()
    try {
      const { updateProfile } = await import('./api')
      const result = await updateProfile({ fullName, phone, baseUrl })
      if (result.ok && result.passenger) {
        setPassenger({
          name: result.passenger.fullName,
          fullName: result.passenger.fullName,
          email: result.passenger.email,
          phone: result.passenger.phone,
          membership: 'Premium Member',
        })
      }
      return result
    } catch (error) {
      console.error('Failed to update passenger profile:', error)
      throw error
    }
  }, [])

  const clearFlight = useCallback((id) => {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const completeFlight = useCallback((id) => {
    setFlights((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'Completed' } : f))
    )
  }, [])

  const markAsRead = useCallback(async (id) => {
    const baseUrl = getApiBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/portal/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        )
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [token])

  const markAllAsRead = useCallback(async () => {
    const baseUrl = getApiBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/portal/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }, [token])

  const triggerOverlay = useCallback(async (message, action) => {
    setOverlay({ show: true, message, status: 'loading' })
    try {
      await action()
      setOverlay({ show: true, message: 'Success', status: 'success' })
      await new Promise(r => setTimeout(r, 1500))
    } catch (err) {
      console.error(err)
      setOverlay({ show: true, message: err.message || 'Action failed', status: 'error' })
      await new Promise(r => setTimeout(r, 2000))
    } finally {
      setOverlay({ show: false, message: '', status: 'loading' })
    }
  }, [])

  const uploadPassport = useCallback((data) => {
    console.log('Passport Upload:', data)
    // This would ideally hit an API endpoint like PATCH /api/passengers/:id/documents
  }, [])


  const value = useMemo(
    () => ({
      passenger,
      flights,
      notifications,
      documents,
      setNotifications,
      unreadCount,
      addBooking,
      updatePassengerProfile,
      clearFlight,
      completeFlight,
      markAsRead,
      markAllAsRead,
      uploadPassport,
      triggerOverlay,
      loading,
      overlay,
    }),
    [
      passenger,
      flights,
      notifications,
      documents,
      unreadCount,
      loading,
      overlay,
      addBooking,
      updatePassengerProfile,
      clearFlight,
      completeFlight,
      markAsRead,
      markAllAsRead,
      uploadPassport,
      triggerOverlay,
    ]
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
