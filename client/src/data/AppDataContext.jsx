import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchFlights, fetchNotifications, fetchPassenger, getApiBaseUrl, submitBookingRequest, cancelBookingAPI, updateProfile } from './api'
import { useAuth } from './AuthContext'
import airportsData from '../../airports.json'

// Haversine distance helper
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateFlightMetrics(originIata, destIata, departTime24) {
  if (!originIata || !destIata) return { duration: 'TBD', arriveTime24: 'TBD' };
  
  const origin = airportsData.find(a => a.iata === originIata);
  const dest = airportsData.find(a => a.iata === destIata);

  if (!origin || !dest) return { duration: 'TBD', arriveTime24: 'TBD' };

  const distKm = calculateDistance(Number(origin.latitude), Number(origin.longitude), Number(dest.latitude), Number(dest.longitude));
  // Commercial flight avg 850 km/h + 45 mins padding for taxi/takeoff/landing
  const flightTimeHours = (distKm / 850) + 0.75;
  
  const h = Math.floor(flightTimeHours);
  const m = Math.round((flightTimeHours - h) * 60);
  
  const durationStr = `${h}h ${m.toString().padStart(2, '0')}m`;

  let arriveTime = 'TBD';
  if (departTime24 && departTime24 !== 'TBD') {
    const [depH, depM] = departTime24.split(':').map(Number);
    let arrH = depH + h;
    let arrM = depM + m;
    
    if (arrM >= 60) {
      arrH += Math.floor(arrM / 60);
      arrM = arrM % 60;
    }
    arrH = arrH % 24; 
    arriveTime = `${arrH.toString().padStart(2, '0')}:${arrM.toString().padStart(2, '0')}`;
  }

  return { duration: durationStr, arriveTime24: arriveTime };
}

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
          setFlights(f.map(b => {
            const metrics = calculateFlightMetrics(b.origin?.iata, b.destination?.iata, b.departureTime24 || '00:00');
            return {
              id: b._id,
              airline: b.airlineName,
              flightNumber: b.flightNumber,
              logoUrl: `https://picsum.photos/seed/${encodeURIComponent(b.airlineName)}/64/64`,
              status: (b.status === 'completed' || new Date(b.departureDateTimeUtc) < new Date()) 
                ? 'Completed' 
                : (b.status === 'cancelled' ? 'Cancelled' : (b.status === 'updated' ? 'Updated' : 'On Time')),
              date: new Date(b.departureDateTimeUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              fromCity: b.origin?.city,
              fromCode: b.origin?.iata,
              departTime24: b.departureTime24 || '00:00',
              toCity: b.destination?.city,
              toCode: b.destination?.iata,
              arriveTime24: metrics.arriveTime24,
              duration: metrics.duration,
              seat: '24A',
              bags: '2 Bags',
              weather: b.weather || { label: 'Weather', tempC: 22, desc: 'Fair', type: 'cloudSun', advice: 'Enjoy your flight!' },
            };
          }))
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
        if (err.name === 'AbortError') return; // Ignore intentional aborts on unmount
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

  const clearFlight = useCallback(async (id) => {
    const baseUrl = getApiBaseUrl();
    try {
      // Optimistically remove from UI
      setFlights((prev) => prev.filter((f) => f.id !== id));
      
      // Tell backend to cancel and send emails/admin notifications
      await cancelBookingAPI({ id, baseUrl });

      // Refresh notifications so the user gets their cancellation confirmation receipt
      const n = await fetchNotifications({ baseUrl });
      if (Array.isArray(n)) {
        setNotifications(n.map(item => ({
          id: item._id,
          type: item.type === 'passport_alert' ? 'passport' : 'flight',
          title: item.type === 'passport_alert' ? 'Passport Alert' : 'Flight Update',
          message: item.message,
          timeAgo: 'Recently',
          unread: !item.read,
          actionLabel: 'View Details'
        })));
      }
    } catch (err) {
      console.error('Failed to sync flight cancellation to server:', err);
    }
  }, []);

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
