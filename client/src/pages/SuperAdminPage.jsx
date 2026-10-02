import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Lucide from 'lucide-react'
import { getApiBaseUrl, createBlog, fetchStaffMembers, deleteStaffMember, resendStaffCredentials } from '../data/api'
import Modal from '../components/Modal'
import clsx from 'clsx'
import { convertTo12Hour } from '../utils/time'
import { useAppData } from '../data/AppDataContext'
import ActionButton from '../components/ActionButton'
import airportData from '../../airports.json'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import SpreadsheetScheduleView from '../components/schedule/SpreadsheetScheduleView'
import DutyManagementView from '../components/schedule/DutyManagementView'
import TravelCardManager from '../components/travelCard/TravelCardManager'
import PushNotificationToggle from '../components/PushNotificationToggle'

function AirportAutocomplete({ label, onSelect, onChange, initialCity, initialIata }) {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef(null)

    useEffect(() => {
        if (initialCity && initialIata) {
            setQuery(`${initialCity} (${initialIata})`)
        } else if (initialCity) {
            setQuery(initialCity)
        } else {
            setQuery('')
        }
    }, [initialCity, initialIata])

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [wrapperRef])

    const handleSearch = (e) => {
        const value = e.target.value
        setQuery(value)
        if (onChange) onChange(value)

        if (value.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        const filtered = airportData.filter(item =>
            item.city?.toLowerCase().includes(value.toLowerCase()) ||
            item.iata?.toLowerCase().includes(value.toLowerCase()) ||
            item.airport_name?.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10)

        setSuggestions(filtered)
        setShowSuggestions(true)
    }

    const handleSelect = (airport) => {
        setQuery(`${airport.city} (${airport.iata})`)
        onSelect(airport)
        setShowSuggestions(false)
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
            <div className="relative">
                <Lucide.MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={query}
                    onChange={handleSearch}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                    className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 truncate"
                    placeholder="Search city, airport or IATA..."
                />
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((airport, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(airport)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900">{airport.city}</span>
                                <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded">{airport.iata}</span>
                            </div>
                            <div className="text-xs text-slate-500 truncate">{airport.airport_name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function isTokenExpired(t) {
    if (!t) return true
    try {
        const parts = t.split('.')
        if (parts.length !== 3) return true
        const payload = JSON.parse(atob(parts[1]))
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return true
        }
        return false
    } catch {
        return true
    }
}

export default function SuperAdminPage({ initialTab = 'overview' } = {}) {
    const navigate = useNavigate()
    const [authInit] = useState(() => {
        // If user explicitly navigated to a login path, show login form
        if (typeof window !== 'undefined' && window.location.pathname.endsWith('/login')) {
            return { token: null, role: null }
        }

        const adminToken = localStorage.getItem('admin_token')
        const adminRole = localStorage.getItem('admin_role')
        if (adminToken && adminRole) {
            if (!isTokenExpired(adminToken)) {
                return { token: adminToken, role: adminRole }
            }
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_role')
        }

        const genToken = localStorage.getItem('token')
        const userSaved = localStorage.getItem('user')
        if (genToken && userSaved) {
            try {
                const parsed = JSON.parse(userSaved)
                if (['admin', 'staff', 'agent'].includes(parsed.role)) {
                    if (!isTokenExpired(genToken)) {
                        localStorage.setItem('admin_token', genToken)
                        localStorage.setItem('admin_role', parsed.role)
                        return { token: genToken, role: parsed.role }
                    }
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                }
            } catch {
                // ignore
            }
        }
        return { token: null, role: null }
    })
    const [token, setToken] = useState(authInit.token)
    const [role, setRole] = useState(authInit.role)
    const [activeView, setActiveView] = useState('all') // 'all' or 'today'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const { triggerOverlay } = useAppData()

    // Data State
    const [passengers, setPassengers] = useState([])
    const [bookings, setBookings] = useState([])
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedPassenger, setSelectedPassenger] = useState(null)

    // Login State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loginError, setLoginError] = useState('')
    const [sessionExpiredNotice, setSessionExpiredNotice] = useState(() => {
        const stored = sessionStorage.getItem('session_expired_notice')
        if (stored) {
            sessionStorage.removeItem('session_expired_notice')
            return stored
        }
        return ''
    })

    useEffect(() => {
        const handleSessionRestored = (e) => {
            const { token: newToken, role: newRole } = e.detail || {}
            if (newToken && ['admin', 'staff', 'agent'].includes(newRole)) {
                setToken(newToken)
                setRole(newRole)
                setSessionExpiredNotice('')
            }
        }
        window.addEventListener('dnarai:session-restored', handleSessionRestored)
        return () => window.removeEventListener('dnarai:session-restored', handleSessionRestored)
    }, [])

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isCreatePassengerModalOpen, setIsCreatePassengerModalOpen] = useState(false)
    const [isCreateBookingModalOpen, setIsCreateBookingModalOpen] = useState(false)
    const [isCreateReminderModalOpen, setIsCreateReminderModalOpen] = useState(false)
    const [isPassengerDetailsModalOpen, setIsPassengerDetailsModalOpen] = useState(false)
    const [onboardingSuccess, setOnboardingSuccess] = useState(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState(null) // { passenger: {...} }
    const [isEditBookingModalOpen, setIsEditBookingModalOpen] = useState(false)
    const [isAllNotificationsModalOpen, setIsAllNotificationsModalOpen] = useState(false)
    const [bookingFilter, setBookingFilter] = useState('recent') // 'recent' or 'all'
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
    const [addStaffForm, setAddStaffForm] = useState({ email: '', role: 'staff', password: '' })
    const [staffCreationSuccess, setStaffCreationSuccess] = useState(null)
    const [isStaffManagerModalOpen, setIsStaffManagerModalOpen] = useState(false)
    const [staffMembers, setStaffMembers] = useState([])
    const [isLoadingStaff, setIsLoadingStaff] = useState(false)
    const [staffSearchQuery, setStaffSearchQuery] = useState('')
    const [resendingStaffId, setResendingStaffId] = useState(null)
    const [deletingStaffId, setDeletingStaffId] = useState(null)
    const [staffActionFeedback, setStaffActionFeedback] = useState(null)
    const [isCreateBlogModalOpen, setIsCreateBlogModalOpen] = useState(false)
    const [isBlogManagerModalOpen, setIsBlogManagerModalOpen] = useState(false)
    const [createBlogForm, setCreateBlogForm] = useState({ title: '', content: '' })
    const [blogs, setBlogs] = useState([])
    const [editingBlog, setEditingBlog] = useState(null)
    const [invoices, setInvoices] = useState([])
    const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false)
    const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false)
    const [isShareInvoiceModalOpen, setIsShareInvoiceModalOpen] = useState(false)
    const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState(null)
    const [editingInvoiceId, setEditingInvoiceId] = useState(null)
    const [editInvoiceForm, setEditInvoiceForm] = useState({
        passengerId: '',
        passengerName: '',
        passengerEmail: '',
        passengerPhone: '',
        date: '',
        invoiceNumber: '',
        items: [{ description: '', rate: 0, qty: 1, amount: 0, subText: '' }],
        serviceCharge: 0,
        subTotal: 0,
        discount: 0,
        total: 0,
        paymentType: 'bank_transfer',
        currency: '₦',
        balanceDue: 0,
        isPaid: false,
        notes: ''
    })
    const [invoiceForm, setInvoiceForm] = useState({
        passengerId: '',
        passengerName: '',
        passengerEmail: '',
        passengerPhone: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        items: [{ description: '', rate: 0, qty: 1, amount: 0, subText: '' }],
        serviceCharge: 0,
        discount: 0,
        paymentType: 'bank_transfer',
        currency: '₦',
        balanceDue: 0,
        isPaid: false
    })

    // Navigation & Layout State
    const [activeTab, setActiveTab] = useState(initialTab || 'overview') // 'overview', 'passengers', 'bookings', 'invoices', 'insights', 'staff', 'schedules', 'duties', 'travel-card', 'alerts'
    const [travelCardPassengerId, setTravelCardPassengerId] = useState(null)

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab)
        }
    }, [initialTab])

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)

    // Modals State
    const [isTravelingTodayModalOpen, setIsTravelingTodayModalOpen] = useState(false)
    const [isActiveBookingsModalOpen, setIsActiveBookingsModalOpen] = useState(false)

    const [editForm, setEditForm] = useState({})
    const [createPassengerForm, setCreatePassengerForm] = useState({ fullName: '', email: '', phone: '' })
    const [createBookingForm, setCreateBookingForm] = useState({
        airlineName: '', flightNumber: '', originCity: '', originIata: '',
        destCity: '', destIata: '', departureDate: '', departureTime: '',
        bookingReference: '', ticketNumber: ''
    })
    const [reminderForm, setReminderForm] = useState({
        email: '', fullName: '', phone: '',
        airlineName: '', flightNumber: '', originCity: '', originIata: '',
        destCity: '', destIata: '', departureDate: '', departureTime: '',
        bookingReference: '', ticketNumber: ''
    })
    const [editBookingForm, setEditBookingForm] = useState({})
    const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] = useState(false)
    const [viewingBooking, setViewingBooking] = useState(null)

    // Refs for scrolling
    const quickActionsRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
                setIsQuickActionsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const baseUrl = getApiBaseUrl()

    const handleLogout = useCallback((expiredMessage = null) => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_role')
        if (expiredMessage) {
            sessionStorage.setItem('session_expired_notice', expiredMessage)
            setSessionExpiredNotice(expiredMessage)
        }
        setToken(null)
        setRole(null)
    }, [])

    useEffect(() => {
        async function fetchAllData() {
            setLoading(true)
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [passengersRes, bookingsRes, notifsRes, blogsRes, invoicesRes] = await Promise.all([
                    fetch(`${baseUrl}/api/passengers`, { headers }),
                    fetch(`${baseUrl}/api/bookings`, { headers }),
                    fetch(`${baseUrl}/api/notifications`, { headers }),
                    fetch(`${baseUrl}/api/blogs`),
                    fetch(`${baseUrl}/api/invoices`, { headers })
                ])

                if (passengersRes.status === 401 || bookingsRes.status === 401 || notifsRes.status === 401 || blogsRes.status === 401 || invoicesRes.status === 401) {
                    const notice = 'Your admin session has expired. Please sign in again.'
                    handleLogout(notice)
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent('dnarai:session-expired', {
                                detail: {
                                    message: notice,
                                    url: window.location.pathname,
                                },
                            })
                        )
                    }
                    return
                }

                const [pData, bData, nData, blData, iData] = await Promise.all([
                    passengersRes.json(),
                    bookingsRes.json(),
                    notifsRes.json(),
                    blogsRes.json(),
                    invoicesRes.json()
                ])

                if (passengersRes.ok) setPassengers(pData)
                if (bookingsRes.ok) setBookings(bData)
                if (notifsRes.ok) setNotifications(Array.isArray(nData) ? nData : [])
                if (blogsRes.ok) setBlogs(blData)
                if (invoicesRes.ok) setInvoices(iData)

            } catch (err) {
                console.error('Failed to fetch admin data', err)
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchAllData()
    }, [token, baseUrl, handleLogout])


    async function handleLogin(e) {
        e.preventDefault()
        setLoginError('')
        setSessionExpiredNotice('')
        setLoading(true)
        try {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Auth failed')
            if (!['admin', 'agent', 'staff'].includes(data.role)) throw new Error('Admin access only')
            localStorage.setItem('admin_token', data.accessToken)
            localStorage.setItem('admin_role', data.role)
            localStorage.setItem('token', data.accessToken)
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken)
            }
            localStorage.setItem('user', JSON.stringify({ role: data.role, email }))
            localStorage.setItem('lastActivityTime', Date.now().toString())
            setToken(data.accessToken)
            setRole(data.role)
        } catch (err) {
            setLoginError(err.message)
        } finally {
            setLoading(false)
        }
    }


    async function handleCreatePassenger(e) {
        if (e) e.preventDefault()

        triggerOverlay('Creating Passenger Account...', async () => {
            const res = await fetch(`${baseUrl}/api/agency/onboard-passenger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(createPassengerForm),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create passenger')

            setPassengers([data.passenger, ...passengers])
            setOnboardingSuccess(data)
            setIsCreatePassengerModalOpen(false)
            setCreatePassengerForm({ fullName: '', email: '', phone: '' })
        })
    }

    async function handleUpdatePassenger(e) {
        if (e) e.preventDefault()

        triggerOverlay('Updating Passenger Profile...', async () => {
            const res = await fetch(`${baseUrl}/api/passengers/${editForm.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(editForm),
            })
            if (!res.ok) throw new Error('Update failed')
            const updated = await res.json()
            setPassengers(passengers.map(p => p.id === updated.id ? updated : p))
            setIsEditModalOpen(false)
            if (selectedPassenger?.id === updated.id) setSelectedPassenger(updated)
        })
    }

    async function handleDeletePassenger() {
        if (!deleteConfirmation) return

        triggerOverlay('Deleting Passenger...', async () => {
            const res = await fetch(`${baseUrl}/api/passengers/${deleteConfirmation.passenger.id || deleteConfirmation.passenger._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Delete failed')

            setPassengers(passengers.filter(p => (p.id || p._id) !== (deleteConfirmation.passenger.id || deleteConfirmation.passenger._id)))
            if (selectedPassenger?.id === deleteConfirmation.passenger.id || selectedPassenger?._id === deleteConfirmation.passenger._id) {
                setSelectedPassenger(null)
            }
            setDeleteConfirmation(null)
        })
    }

    async function handleCreateBooking(e) {
        if (e) e.preventDefault()
        if (!selectedPassenger) return

        if (!createBookingForm.originCity || !createBookingForm.originIata || !createBookingForm.destCity || !createBookingForm.destIata) {
            triggerOverlay('Error: All Route details required', async () => { throw new Error('All Route details (City and IATA) are required') })
            return
        }

        triggerOverlay('Synchronizing Flight Data...', async () => {
            const payload = {
                passengerId: selectedPassenger.id || selectedPassenger._id,
                airlineName: createBookingForm.airlineName,
                flightNumber: createBookingForm.flightNumber,
                origin: { city: createBookingForm.originCity, iata: createBookingForm.originIata.toUpperCase() },
                destination: { city: createBookingForm.destCity, iata: createBookingForm.destIata.toUpperCase() },
                departureDateTimeUtc: new Date(`${createBookingForm.departureDate}T${createBookingForm.departureTime || '00:00'}:00Z`).toISOString(),
                departureTime24: createBookingForm.departureTime || undefined,
                bookingReference: createBookingForm.bookingReference || undefined,
                ticketNumber: createBookingForm.ticketNumber || undefined
            }

            const res = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to create booking')

            setBookings([data, ...bookings])
            setIsCreateBookingModalOpen(false)
            setCreateBookingForm({
                airlineName: '', flightNumber: '', originCity: '', originIata: '',
                destCity: '', destIata: '', departureDate: '', departureTime: '',
                bookingReference: '', ticketNumber: ''
            })
        })
    }

    async function handleCreateReminder(e) {
        if (e) e.preventDefault()

        if (!reminderForm.originCity || !reminderForm.originIata || !reminderForm.destCity || !reminderForm.destIata) {
            triggerOverlay('Error: All Route details required', async () => { throw new Error('All Route details (City and IATA) are required') })
            return
        }

        triggerOverlay('Scheduling Reminder...', async () => {
            const payload = {
                email: reminderForm.email,
                fullName: reminderForm.fullName,
                phone: reminderForm.phone || undefined,
                airlineName: reminderForm.airlineName,
                flightNumber: reminderForm.flightNumber,
                origin: { city: reminderForm.originCity, iata: reminderForm.originIata.toUpperCase() },
                destination: { city: reminderForm.destCity, iata: reminderForm.destIata.toUpperCase() },
                departureDateTimeUtc: new Date(`${reminderForm.departureDate}T${reminderForm.departureTime || '00:00'}:00Z`).toISOString(),
                departureTime24: reminderForm.departureTime || undefined,
                bookingReference: reminderForm.bookingReference || undefined,
                ticketNumber: reminderForm.ticketNumber || undefined
            }

            const res = await fetch(`${baseUrl}/api/bookings/set-reminder-no-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to set reminder')

            // Refresh passengers and bookings list
            const headers = { Authorization: `Bearer ${token}` }
            const [pRes, bRes] = await Promise.all([
                fetch(`${baseUrl}/api/passengers`, { headers }),
                fetch(`${baseUrl}/api/bookings`, { headers })
            ])
            if (pRes.ok) setPassengers(await pRes.json())
            if (bRes.ok) setBookings(await bRes.json())

            setIsCreateReminderModalOpen(false)
            setReminderForm({
                email: '', fullName: '', phone: '',
                airlineName: '', flightNumber: '', originCity: '', originIata: '',
                destCity: '', destIata: '', departureDate: '', departureTime: '',
                bookingReference: '', ticketNumber: ''
            })
        })
    }

    async function handleUpdateBooking(e) {
        if (e) e.preventDefault()

        triggerOverlay('Updating Flight Itinerary...', async () => {
            const payload = {
                airlineName: editBookingForm.airlineName,
                flightNumber: editBookingForm.flightNumber,
                origin: { city: editBookingForm.originCity, iata: editBookingForm.originIata?.toUpperCase() },
                destination: { city: editBookingForm.destCity, iata: editBookingForm.destIata?.toUpperCase() },
                departureDateTimeUtc: new Date(`${editBookingForm.departureDate}T${editBookingForm.departureTime || '00:00'}:00Z`).toISOString(),
                departureTime24: editBookingForm.departureTime || undefined,
                status: editBookingForm.status,
                bookingReference: editBookingForm.bookingReference || undefined,
                ticketNumber: editBookingForm.ticketNumber || undefined
            }

            const res = await fetch(`${baseUrl}/api/bookings/${editBookingForm.id || editBookingForm._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to update booking')

            setBookings(bookings.map(b => (b.id === data.id || b._id === data._id) ? data : b))
            setIsEditBookingModalOpen(false)
            if (viewingBooking?._id === data._id || viewingBooking?.id === data.id) setViewingBooking(data)
        })
    }

    function handleViewBookingDetails(booking) {
        setViewingBooking(booking)
        setIsBookingDetailsModalOpen(true)
    }



    function openEditBookingModal(b) {
        const dep = new Date(b.departureDateTimeUtc);
        setEditBookingForm({
            ...b,
            departureDate: dep.getUTCFullYear() + '-' + String(dep.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dep.getUTCDate()).padStart(2, '0'),
            departureTime: String(dep.getUTCHours()).padStart(2, '0') + ':' + String(dep.getUTCMinutes()).padStart(2, '0'),
            originCity: b.origin?.city || '',
            originIata: b.origin?.iata || '',
            destCity: b.destination?.city || '',
            destIata: b.destination?.iata || '',
            bookingReference: b.bookingReference || '',
            ticketNumber: b.ticketNumber || ''
        });
        setIsEditBookingModalOpen(true);
    }

    async function handleClearAllNotifications() {
        if (!window.confirm('Are you sure you want to clear all system alerts? This action is permanent.')) return

        triggerOverlay('Clearing System Alerts...', async () => {
            const res = await fetch(`${baseUrl}/api/notifications`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to clear notifications')
            setNotifications([])
        })
    }

    async function handleMarkAsRead(id) {
        try {
            const res = await fetch(`${baseUrl}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                setNotifications(notifications.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n))
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    async function handleMarkAllAsRead() {
        triggerOverlay('Marking alerts as read...', async () => {
            const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to update notifications')
            setNotifications(notifications.map(n => ({ ...n, read: true })))
        })
    }

    const currentAdminEmail = useMemo(() => {
        if (!token) return ''
        try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            return payload.email || ''
        } catch {
            return ''
        }
    }, [token])

    const loadStaffMembers = useCallback(async () => {
        if (!token || role !== 'admin') return
        setIsLoadingStaff(true)
        try {
            const data = await fetchStaffMembers({ baseUrl, token })
            if (data?.ok && Array.isArray(data.staff)) {
                setStaffMembers(data.staff)
            }
        } catch (err) {
            console.error('Failed to load staff members:', err)
        } finally {
            setIsLoadingStaff(false)
        }
    }, [baseUrl, token, role])

    useEffect(() => {
        if (role === 'admin' && token) {
            loadStaffMembers()
        }
    }, [role, token, loadStaffMembers])

    const filteredStaff = useMemo(() => {
        if (!staffSearchQuery.trim()) return staffMembers
        const q = staffSearchQuery.toLowerCase()
        return staffMembers.filter(s =>
            s.email?.toLowerCase().includes(q) ||
            s.role?.toLowerCase().includes(q)
        )
    }, [staffMembers, staffSearchQuery])

    async function handleDeleteStaff(staffId, staffEmail) {
        if (!window.confirm(`Are you sure you want to remove staff member "${staffEmail}"? They will lose access immediately.`)) {
            return
        }

        setDeletingStaffId(staffId)
        setStaffActionFeedback(null)
        try {
            const data = await deleteStaffMember({ id: staffId, baseUrl, token })
            if (!data?.ok) throw new Error(data?.message || 'Failed to remove staff member')
            setStaffMembers(prev => prev.filter(s => s._id !== staffId))
            setStaffActionFeedback({ type: 'success', message: `Staff member ${staffEmail} removed successfully.` })
        } catch (err) {
            setStaffActionFeedback({ type: 'error', message: err.message || 'Error removing staff member' })
        } finally {
            setDeletingStaffId(null)
        }
    }

    async function handleResendStaffCredentials(staffId, staffEmail) {
        setResendingStaffId(staffId)
        setStaffActionFeedback(null)
        try {
            const data = await resendStaffCredentials({ id: staffId, baseUrl, token })
            if (!data?.ok) throw new Error(data?.message || 'Failed to resend credentials')
            setStaffActionFeedback({
                type: 'success',
                message: data.emailSent
                    ? `New credentials emailed to ${staffEmail}. (Temporary password: ${data.tempPassword})`
                    : `Password reset to ${data.tempPassword}, but email delivery failed.`
            })
        } catch (err) {
            setStaffActionFeedback({ type: 'error', message: err.message || 'Error resending credentials' })
        } finally {
            setResendingStaffId(null)
        }
    }

    async function handleAddStaff(e) {
        if (e) e.preventDefault()

        triggerOverlay('Registering Staff Member...', async () => {
            const res = await fetch(`${baseUrl}/api/auth/add-staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(addStaffForm),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to add staff')

            setStaffCreationSuccess(data)
            setIsAddStaffModalOpen(false)
            setAddStaffForm({ email: '', role: 'staff', password: '' })
            loadStaffMembers()
        })
    }

    async function handleCreateBlog(e) {
        if (e) e.preventDefault()
        triggerOverlay('Publishing Insight...', async () => {
            const blog = await createBlog({ ...createBlogForm, baseUrl, token })
            setIsCreateBlogModalOpen(false)
            setCreateBlogForm({ title: '', content: '' })
            setBlogs(prev => [blog, ...prev])
            // Refresh notifications... to show the broadcast worked
            const headers = { Authorization: `Bearer ${token}` }
            const resN = await fetch(`${baseUrl}/api/notifications`, { headers })
            const dataN = await resN.json()
            setNotifications(Array.isArray(dataN) ? dataN : [])
        })
    }

    async function handleUpdateBlog(e) {
        if (e) e.preventDefault()
        triggerOverlay('Updating Insight...', async () => {
            const res = await fetch(`${baseUrl}/api/blogs/${editingBlog._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingBlog)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Update failed')

            setBlogs(blogs.map(b => b._id === data._id ? data : b))
            setEditingBlog(null)
        })
    }

    async function handleDeleteBlog(blogId) {
        if (!confirm('Are you sure you want to delete this insight?')) return
        triggerOverlay('Deleting Insight...', async () => {
            const res = await fetch(`${baseUrl}/api/blogs/${blogId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Delete failed')
            setBlogs(blogs.filter(b => b._id !== blogId))
        })
    }

    const handleCreateInvoice = async (e) => {
        if (e) e.preventDefault();
        triggerOverlay('Generating Invoice...', async () => {
            const res = await fetch(`${baseUrl}/api/invoices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(invoiceForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create invoice');
            setInvoices([data, ...invoices]);
            setIsCreateInvoiceModalOpen(false);
            // Reset form
            setInvoiceForm({
                passengerId: '',
                passengerName: '',
                passengerEmail: '',
                passengerPhone: '',
                date: new Date().toISOString().split('T')[0],
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                items: [{ description: '', rate: 0, qty: 1, amount: 0, subText: '' }],
                serviceCharge: 0,
                discount: 0,
                paymentType: 'bank_transfer',
                currency: '₦',
                balanceDue: 0,
                isPaid: false
            });
        });
    };

    const openEditInvoiceModal = (inv) => {
        setEditingInvoiceId(inv._id || inv.id);
        const subTotal = inv.subTotal !== undefined
            ? Number(inv.subTotal)
            : (inv.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
        const serviceCharge = Number(inv.serviceCharge) || 0;
        const discount = Number(inv.discount) || 0;
        const total = inv.total !== undefined
            ? Number(inv.total)
            : (subTotal + serviceCharge - discount);
        const isPaid = Boolean(inv.isPaid || inv.status === 'paid' || (inv.balanceDue === 0 && total > 0));

        setEditInvoiceForm({
            passengerId: inv.passengerId?._id || inv.passengerId || '',
            passengerName: inv.passengerName || '',
            passengerEmail: inv.passengerEmail || '',
            passengerPhone: inv.passengerPhone || '',
            date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            invoiceNumber: inv.invoiceNumber || '',
            items: inv.items && inv.items.length > 0
                ? inv.items.map(it => ({
                    description: it.description || '',
                    rate: Number(it.rate) || 0,
                    qty: Number(it.qty) || 1,
                    amount: Number(it.amount) || (Number(it.rate) * Number(it.qty)) || 0,
                    subText: it.subText || ''
                }))
                : [{ description: '', rate: 0, qty: 1, amount: 0, subText: '' }],
            serviceCharge,
            subTotal,
            discount,
            total,
            paymentType: inv.paymentType || 'bank_transfer',
            currency: inv.currency || '₦',
            balanceDue: isPaid ? 0 : (inv.balanceDue !== undefined ? Number(inv.balanceDue) : total),
            isPaid,
            notes: inv.notes || "Our Service End when you successfully arrive your destination."
        });
        setIsEditInvoiceModalOpen(true);
    };

    const handleUpdateInvoice = async (e) => {
        if (e) e.preventDefault();
        if (!editingInvoiceId) return;

        triggerOverlay('Updating Invoice...', async () => {
            const res = await fetch(`${baseUrl}/api/invoices/${editingInvoiceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editInvoiceForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update invoice');

            setInvoices(invoices.map(i => ((i._id || i.id) === (data._id || data.id)) ? data : i));
            setIsEditInvoiceModalOpen(false);
            setEditingInvoiceId(null);
        });
    };

    const handleToggleInvoicePaid = async (inv) => {
        const currentPaid = Boolean(inv.isPaid || inv.status === 'paid' || (inv.balanceDue === 0 && Number(inv.total) > 0));
        const newIsPaid = !currentPaid;
        const newBalanceDue = newIsPaid ? 0 : (Number(inv.total) || 0);

        triggerOverlay(newIsPaid ? 'Marking Invoice as Paid...' : 'Marking Invoice as Unpaid...', async () => {
            const res = await fetch(`${baseUrl}/api/invoices/${inv._id || inv.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    isPaid: newIsPaid,
                    status: newIsPaid ? 'paid' : 'unpaid',
                    balanceDue: newBalanceDue
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update payment status');

            setInvoices(invoices.map(i => ((i._id || i.id) === (data._id || data.id)) ? data : i));
        });
    };

    const addEditInvoiceItem = () => {
        setEditInvoiceForm(prev => ({
            ...prev,
            items: [...prev.items, { description: '', rate: 0, qty: 1, amount: 0, subText: '' }]
        }));
    };

    const removeEditInvoiceItem = (index) => {
        if (editInvoiceForm.items.length <= 1) return;
        const newItems = [...editInvoiceForm.items];
        newItems.splice(index, 1);
        const subTotal = newItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const total = subTotal + Number(editInvoiceForm.serviceCharge || 0) - Number(editInvoiceForm.discount || 0);
        setEditInvoiceForm({
            ...editInvoiceForm,
            items: newItems,
            subTotal,
            total,
            balanceDue: editInvoiceForm.isPaid ? 0 : total
        });
    };

    const handleEditInvoiceItemChange = (index, field, value) => {
        const newItems = [...editInvoiceForm.items];
        newItems[index][field] = value;
        if (field === 'rate' || field === 'qty') {
            newItems[index].amount = Number(newItems[index].rate || 0) * Number(newItems[index].qty || 0);
        }

        const subTotal = newItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const total = subTotal + Number(editInvoiceForm.serviceCharge || 0) - Number(editInvoiceForm.discount || 0);

        setEditInvoiceForm({
            ...editInvoiceForm,
            items: newItems,
            subTotal,
            total,
            balanceDue: editInvoiceForm.isPaid ? 0 : total
        });
    };

    const handleDeleteAllInvoices = async () => {
        if (!window.confirm('Are you sure you want to delete ALL invoices? This action cannot be undone and they will be removed from the database.')) return;

        triggerOverlay('Deleting All Invoices...', async () => {
            const res = await fetch(`${baseUrl}/api/invoices/all`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete all invoices');
            }
            setInvoices([]);
        });
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action is permanent.')) return;
        triggerOverlay('Deleting Invoice...', async () => {
            const res = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Delete failed');
            setInvoices(invoices.filter(i => (i._id || i.id) !== invoiceId));
        });
    };

    const handleDownloadInvoice = async (inv) => {
        setSelectedInvoiceForShare(inv);
        // Small delay to ensure the PDF template renders with the data
        setTimeout(async () => {
            const element = document.getElementById('invoice-pdf-template');
            if (!element) {
                alert('Invoice template not found. Please try again.');
                return;
            }
            try {
                const canvas = await html2canvas(element, {
                    scale: 3, // Increased scale for high definition
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new jsPDF('p', 'mm', 'a4', true);
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                pdf.save(`Invoice_${inv.invoiceNumber}_${inv.passengerName.replace(/\s+/g, '_')}.pdf`);
            } catch (err) {
                console.error('PDF generation failed', err);
                alert('Failed to generate PDF. Please check your connection.');
            } finally {
                setSelectedInvoiceForShare(null);
            }
        }, 300);
    };

    const addInvoiceItem = () => {
        setInvoiceForm({
            ...invoiceForm,
            items: [...invoiceForm.items, { description: '', rate: 0, qty: 1, amount: 0, subText: '' }]
        });
    };

    const removeInvoiceItem = (index) => {
        const newItems = [...invoiceForm.items];
        newItems.splice(index, 1);
        setInvoiceForm({ ...invoiceForm, items: newItems });
    };

    const handleInvoiceItemChange = (index, field, value) => {
        const newItems = [...invoiceForm.items];
        newItems[index][field] = value;
        if (field === 'rate' || field === 'qty') {
            newItems[index].amount = newItems[index].rate * newItems[index].qty;
        }

        // Calculate totals
        const subTotal = newItems.reduce((sum, item) => sum + item.amount, 0);
        const total = subTotal + Number(invoiceForm.serviceCharge) - Number(invoiceForm.discount);

        setInvoiceForm({
            ...invoiceForm,
            items: newItems,
            subTotal,
            total,
            balanceDue: invoiceForm.isPaid ? 0 : total
        });
    };

    const handleShareWithPassenger = async (passenger) => {
        if (!selectedInvoiceForShare) return;

        // If passenger is null, we use the invoice's own contact info
        const targetName = passenger ? passenger.fullName : selectedInvoiceForShare.passengerName;
        const targetEmail = passenger ? passenger.email : selectedInvoiceForShare.passengerEmail;
        const targetPhone = passenger ? passenger.phone : selectedInvoiceForShare.passengerPhone;
        const targetId = passenger ? (passenger.id || passenger._id) : '';

        triggerOverlay('Preparing PDF & Sending...', async () => {
            const element = document.getElementById('invoice-pdf-template');
            if (!element) throw new Error('Template not found');

            const canvas = await html2canvas(element, {
                scale: 3, // Increased scale for high definition
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            const pdfBase64 = pdf.output('datauristring').split(',')[1];

            // Send to backend
            const res = await fetch(`${baseUrl}/api/invoices/${selectedInvoiceForShare._id}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    passengerId: targetId,
                    manualEmail: targetEmail,
                    manualName: targetName,
                    pdfBase64
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to send invoice');

            // Open WhatsApp
            const message = encodeURIComponent(`Hello ${targetName}, this is your invoice for your current travel.`);
            const cleanPhone = targetPhone?.replace(/[^0-9]/g, '') || '';
            if (cleanPhone) {
                const waLink = `https://wa.me/${cleanPhone.startsWith('234') ? cleanPhone : '234' + cleanPhone}?text=${message}`;
                window.open(waLink, '_blank');
            }

            setIsShareInvoiceModalOpen(false);
            setSelectedInvoiceForShare(null);
            alert(`Invoice sent to ${targetEmail}${cleanPhone ? ' and WhatsApp link opened!' : '!'}`);
        });
    };

    // Get passengers traveling on selected date
    const travelingPassengers = useMemo(() => {
        const targetDate = new Date(selectedDate).toISOString().split('T')[0]
        const travelingBookings = bookings.filter(b => {
            const bookingDate = new Date(b.departureDateTimeUtc).toISOString().split('T')[0]
            return bookingDate === targetDate
        })

        const passengerIds = new Set(travelingBookings.map(b => b.passengerId))
        return passengers.filter(p => passengerIds.has(p.id || p._id))
            .map(p => {
                const passengerBookings = travelingBookings.filter(b => b.passengerId === (p.id || p._id))
                return { ...p, bookings: passengerBookings }
            })
    }, [passengers, bookings, selectedDate])

    const filteredPassengers = useMemo(() => {
        const list = activeView === 'today' ? travelingPassengers : passengers
        return list.filter(p =>
            p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [passengers, travelingPassengers, searchQuery, activeView])

    const PASSENGERS_PER_PAGE = 10
    const [passengerPage, setPassengerPage] = useState(1)

    useEffect(() => {
        setPassengerPage(1)
    }, [searchQuery, activeView, selectedDate])

    const totalPages = Math.ceil(filteredPassengers.length / PASSENGERS_PER_PAGE)

    // Clamp passengerPage to totalPages if it exceeds it (e.g. after deletions)
    useEffect(() => {
        if (passengerPage > totalPages && totalPages > 0) {
            setPassengerPage(totalPages)
        }
    }, [totalPages, passengerPage])

    const startIndex = (passengerPage - 1) * PASSENGERS_PER_PAGE
    const endIndex = startIndex + PASSENGERS_PER_PAGE
    const paginatedPassengers = filteredPassengers.slice(startIndex, endIndex)

    // Bookings Pagination
    const BOOKINGS_PER_PAGE = 5
    const [bookingPage, setBookingPage] = useState(1)

    const displayedBookings = useMemo(() => {
        return bookingFilter === 'recent' ? bookings.slice(0, 6) : bookings
    }, [bookings, bookingFilter])

    useEffect(() => {
        setBookingPage(1)
    }, [bookingFilter])

    const totalBookingPages = Math.ceil(displayedBookings.length / BOOKINGS_PER_PAGE)

    useEffect(() => {
        if (bookingPage > totalBookingPages && totalBookingPages > 0) {
            setBookingPage(totalBookingPages)
        }
    }, [totalBookingPages, bookingPage])

    const paginatedBookings = useMemo(() => {
        const start = (bookingPage - 1) * BOOKINGS_PER_PAGE
        return displayedBookings.slice(start, start + BOOKINGS_PER_PAGE)
    }, [displayedBookings, bookingPage])

    // Invoices Pagination
    const INVOICES_PER_PAGE = 5
    const [invoicePage, setInvoicePage] = useState(1)
    const totalInvoicePages = Math.ceil(invoices.length / INVOICES_PER_PAGE)

    useEffect(() => {
        if (invoicePage > totalInvoicePages && totalInvoicePages > 0) {
            setInvoicePage(totalInvoicePages)
        }
    }, [totalInvoicePages, invoicePage])

    const paginatedInvoices = useMemo(() => {
        const start = (invoicePage - 1) * INVOICES_PER_PAGE
        return invoices.slice(start, start + INVOICES_PER_PAGE)
    }, [invoices, invoicePage])

    // Insights/Blogs Pagination
    const INSIGHTS_PER_PAGE = 5
    const [insightPage, setInsightPage] = useState(1)
    const totalInsightPages = Math.ceil(blogs.length / INSIGHTS_PER_PAGE)

    useEffect(() => {
        if (insightPage > totalInsightPages && totalInsightPages > 0) {
            setInsightPage(totalInsightPages)
        }
    }, [totalInsightPages, insightPage])

    const paginatedBlogs = useMemo(() => {
        const start = (insightPage - 1) * INSIGHTS_PER_PAGE
        return blogs.slice(start, start + INSIGHTS_PER_PAGE)
    }, [blogs, insightPage])

    useEffect(() => {
        if (isBlogManagerModalOpen) {
            setInsightPage(1)
        }
    }, [isBlogManagerModalOpen])


    const stats = useMemo(() => ({
        totalPassengers: passengers.length,
        activeBookings: bookings.filter(b => b.status === 'confirmed' && new Date(b.departureDateTimeUtc) >= new Date()).length,
        pendingNotifications: notifications.filter(n => !n.read).length,
        travelingToday: travelingPassengers.length
    }), [passengers, bookings, notifications, travelingPassengers])

    // Total Billed Revenue WITHOUT service charge (net travel bookings)
    const totalBilledRevenue = useMemo(() => {
        return invoices.reduce((sum, inv) => {
            const service = Number(inv.serviceCharge) || 0;
            const tot = Number(inv.total) || 0;
            const sub = inv.subTotal !== undefined && inv.subTotal !== null
                ? Number(inv.subTotal)
                : Math.max(0, tot - service + (Number(inv.discount) || 0));
            return sum + sub;
        }, 0);
    }, [invoices]);

    // Total Profit / Service Charge (Agency Margin)
    const totalServiceChargeProfit = useMemo(() => {
        return invoices.reduce((sum, inv) => sum + (Number(inv.serviceCharge) || 0), 0);
    }, [invoices]);

    const paidInvoicesCount = useMemo(() => {
        return invoices.filter(inv => inv.isPaid || inv.status === 'paid' || (inv.balanceDue === 0 && Number(inv.total) > 0)).length;
    }, [invoices]);





    // LOGIN SCREEN
    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8 space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ocean-600 text-white shadow-2xl shadow-ocean-600/50">
                            <Lucide.ShieldCheck size={36} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Dnarai Enterprise</h1>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Agency Control Center</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-2xl">
                        <form className="space-y-6" onSubmit={handleLogin}>
                            {sessionExpiredNotice && !loginError && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                                    <Lucide.ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-black uppercase tracking-wider text-[10px] text-amber-700">Session Expired</p>
                                        <p className="mt-0.5">{sessionExpiredNotice}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                                    <input
                                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-ocean-500 focus:outline-none focus:bg-white transition-all"
                                        placeholder="admin@dnarai.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
                                    <input
                                        type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-ocean-500 focus:outline-none focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {loginError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                                    {loginError}
                                </div>
                            )}

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-ocean-600 text-white rounded-xl py-4 text-sm font-bold uppercase tracking-wider hover:bg-ocean-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-5 w-5 animate-pulse-slow">
                                            <img src="/D-NARAI_Logo 01.svg" alt="Loading" className="h-full w-full object-contain filter brightness-0 invert" />
                                        </div>
                                        <span>Authenticating...</span>
                                    </div>
                                ) : 'Sign In'}
                            </button>

                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-xs font-bold text-slate-500 hover:text-ocean-600 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <Lucide.ArrowLeft size={14} />
                                    <span>Back to Traveler Sign In</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    // MAIN DASHBOARD
    return (
        <>
            <div className="h-screen h-[100dvh] bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans w-full max-w-full overflow-hidden">
                {/* Desktop Collapsible Sidebar */}
                <aside className={clsx(
                    "hidden md:flex flex-col shrink-0 bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 h-full z-30 select-none",
                    isSidebarCollapsed ? "w-20" : "w-64 lg:w-72"
                )}>
                    {/* Sidebar Brand Header */}
                    <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-10 w-10 bg-ocean-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-ocean-600/30 shrink-0">
                                <Lucide.ShieldCheck size={22} />
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="min-w-0">
                                    <div className="text-sm font-black text-white uppercase tracking-tight truncate font-display">Dnarai Enterprise</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agency Control</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <button
                                onClick={() => setIsSidebarCollapsed(true)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                title="Collapse sidebar"
                            >
                                <Lucide.PanelLeftClose size={18} />
                            </button>
                        )}
                    </div>

                    {/* Navigation Menu */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                        <div>
                            {!isSidebarCollapsed && (
                                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</div>
                            )}
                            <div className="space-y-1">
                                {[
                                    { id: 'overview', label: 'Command Center', short: 'Overview', icon: Lucide.LayoutDashboard, badge: null },
                                    { id: 'passengers', label: 'Passenger Registry', short: 'Passengers', icon: Lucide.Users, badge: passengers.length },
                                    { id: 'bookings', label: 'Flight Bookings', short: 'Bookings', icon: Lucide.PlaneTakeoff, badge: bookings.length },
                                    { id: 'invoices', label: 'Invoices & Billing', short: 'Invoices', icon: Lucide.Receipt, badge: invoices.length },
                                ].map(item => {
                                    const isActive = activeTab === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); if (item.id === 'passengers') setActiveView('all'); }}
                                            title={item.label}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                                isActive
                                                    ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            )}
                                        >
                                            <item.icon size={18} className={clsx(isActive ? "text-white" : "text-slate-400 group-hover:text-ocean-400 transition-colors shrink-0")} />
                                            {!isSidebarCollapsed && (
                                                <span className="flex-1 text-left truncate">{item.short}</span>
                                            )}
                                            {!isSidebarCollapsed && item.badge !== null && (
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                                                )}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            {!isSidebarCollapsed && (
                                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operations & Tools</div>
                            )}
                            <div className="space-y-1">
                                <button
                                    onClick={() => navigate('/super-admin/quotations')}
                                    title="Flight Quotations Comparison Tool"
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all group"
                                >
                                    <Lucide.Sparkles size={18} className="text-amber-400 shrink-0" />
                                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Flight Quotations</span>}
                                    {!isSidebarCollapsed && <Lucide.ExternalLink size={12} className="text-slate-500 opacity-60" />}
                                </button>

                                <button
                                    onClick={() => setActiveTab('travel-card')}
                                    title="Generate Passenger Travel Card & Visual Itinerary Overview"
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                        activeTab === 'travel-card'
                                            ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                    )}
                                >
                                    <Lucide.CreditCard size={18} className={clsx(activeTab === 'travel-card' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Travel Card</span>}
                                    {!isSidebarCollapsed && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            WAT
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => setActiveTab('insights')}
                                    title="Travel Insights & Blog Management"
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                        activeTab === 'insights'
                                            ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                    )}
                                >
                                    <Lucide.BookOpen size={18} className={clsx(activeTab === 'insights' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Insights & Blog</span>}
                                    {!isSidebarCollapsed && blogs.length > 0 && (
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                            activeTab === 'insights' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                                        )}>
                                            {blogs.length}
                                        </span>
                                    )}
                                </button>

                                {role === 'admin' && (
                                    <>
                                        <button
                                            onClick={() => { setActiveTab('staff'); loadStaffMembers(); }}
                                            title="Staff Management"
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                                activeTab === 'staff'
                                                    ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            )}
                                        >
                                            <Lucide.Shield size={18} className={clsx(activeTab === 'staff' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                            {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Staff Team</span>}
                                            {!isSidebarCollapsed && staffMembers.length > 0 && (
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                    activeTab === 'staff' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                                                )}>
                                                    {staffMembers.length}
                                                </span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => { setActiveTab('schedules'); loadStaffMembers(); }}
                                            title="Excel-style Staff Duty Schedules"
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                                activeTab === 'schedules'
                                                    ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            )}
                                        >
                                            <Lucide.CalendarClock size={18} className={clsx(activeTab === 'schedules' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                            {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Staff Schedules</span>}
                                        </button>

                                        <button
                                            onClick={() => { setActiveTab('duties'); loadStaffMembers(); }}
                                            title="Duty Assignment & Management"
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                                activeTab === 'duties'
                                                    ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            )}
                                        >
                                            <Lucide.ClipboardList size={18} className={clsx(activeTab === 'duties' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                            {!isSidebarCollapsed && <span className="flex-1 text-left truncate">Duty Tasks</span>}
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setActiveTab('alerts')}
                                    title="System Notifications & Alerts"
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group",
                                        activeTab === 'alerts'
                                            ? "bg-[#00456E] text-white shadow-md shadow-[#00456E]/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                    )}
                                >
                                    <Lucide.Bell size={18} className={clsx(activeTab === 'alerts' ? "text-white" : "text-slate-400 group-hover:text-ocean-400 shrink-0")} />
                                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">System Alerts</span>}
                                    {stats.pendingNotifications > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
                                            {stats.pendingNotifications}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2 shrink-0">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50">
                            <div className="h-8 w-8 rounded-lg bg-ocean-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {currentAdminEmail ? currentAdminEmail[0].toUpperCase() : 'A'}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-white truncate">{currentAdminEmail || 'Admin User'}</div>
                                    <div className="text-[10px] font-black text-ocean-400 uppercase tracking-wider">{role === 'admin' ? 'Super Admin' : 'Staff Member'}</div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleLogout}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                                title="Sign Out"
                            >
                                <Lucide.LogOut size={16} />
                                {!isSidebarCollapsed && <span>Sign Out</span>}
                            </button>
                            {isSidebarCollapsed && (
                                <button
                                    onClick={() => setIsSidebarCollapsed(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                    title="Expand sidebar"
                                >
                                    <Lucide.PanelLeftOpen size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Mobile Drawer */}
                {isMobileSidebarOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
                        <div className="relative w-72 max-w-[85vw] bg-slate-900 h-full p-4 flex flex-col text-slate-300 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 bg-ocean-600 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
                                        <Lucide.ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white uppercase tracking-tight">Dnarai Enterprise</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agency Control</div>
                                    </div>
                                </div>
                                <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                                    <Lucide.X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                                <div className="space-y-1">
                                    {[
                                        { id: 'overview', label: 'Command Center', icon: Lucide.LayoutDashboard, badge: null },
                                        { id: 'passengers', label: 'Passenger Registry', icon: Lucide.Users, badge: passengers.length },
                                        { id: 'bookings', label: 'Flight Bookings', icon: Lucide.PlaneTakeoff, badge: bookings.length },
                                        { id: 'travel-card', label: 'Travel Card Generator', icon: Lucide.CreditCard, badge: null },
                                        { id: 'invoices', label: 'Invoices & Billing', icon: Lucide.Receipt, badge: invoices.length },
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); setIsMobileSidebarOpen(false); if (item.id === 'passengers') setActiveView('all'); }}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                                activeTab === item.id ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={18} />
                                                <span>{item.label}</span>
                                            </div>
                                            {item.badge !== null && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-2 border-t border-slate-800 space-y-1">
                                    <button
                                        onClick={() => { navigate('/super-admin/quotations'); setIsMobileSidebarOpen(false); }}
                                        className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Lucide.Sparkles size={18} className="text-amber-400" />
                                            <span>Flight Quotations</span>
                                        </div>
                                        <Lucide.ExternalLink size={14} className="text-slate-500" />
                                    </button>

                                    <button
                                        onClick={() => { setActiveTab('insights'); setIsMobileSidebarOpen(false); }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                            activeTab === 'insights' ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Lucide.BookOpen size={18} />
                                            <span>Insights & Blog</span>
                                        </div>
                                        {blogs.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300">
                                                {blogs.length}
                                            </span>
                                        )}
                                    </button>

                                    {role === 'admin' && (
                                        <>
                                            <button
                                                onClick={() => { setActiveTab('staff'); setIsMobileSidebarOpen(false); loadStaffMembers(); }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                                    activeTab === 'staff' ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Lucide.Shield size={18} />
                                                    <span>Staff Team</span>
                                                </div>
                                                {staffMembers.length > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300">
                                                        {staffMembers.length}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => { setActiveTab('schedules'); setIsMobileSidebarOpen(false); loadStaffMembers(); }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                                    activeTab === 'schedules' ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Lucide.CalendarClock size={18} />
                                                    <span>Staff Schedules</span>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => { setActiveTab('duties'); setIsMobileSidebarOpen(false); loadStaffMembers(); }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                                    activeTab === 'duties' ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Lucide.ClipboardList size={18} />
                                                    <span>Duty Tasks</span>
                                                </div>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => { setActiveTab('alerts'); setIsMobileSidebarOpen(false); }}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all",
                                            activeTab === 'alerts' ? "bg-ocean-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Lucide.Bell size={18} />
                                            <span>System Alerts</span>
                                        </div>
                                        {stats.pendingNotifications > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                                                {stats.pendingNotifications}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 space-y-3">
                                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50">
                                    <div className="h-8 w-8 rounded-lg bg-ocean-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                        {currentAdminEmail ? currentAdminEmail[0].toUpperCase() : 'A'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-white truncate">{currentAdminEmail || 'Admin User'}</div>
                                        <div className="text-[10px] font-black text-ocean-400 uppercase tracking-wider">{role === 'admin' ? 'Super Admin' : 'Staff'}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { handleLogout(); setIsMobileSidebarOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
                                >
                                    <Lucide.LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 h-full w-full max-w-full overflow-y-auto overflow-x-hidden">
                    {/* Top Navigation Bar */}
                    <header className="sticky top-0 z-20 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-xs w-full max-w-full">
                        {/* Left: Mobile Toggle & Breadcrumbs */}
                        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
                            <button
                                onClick={() => setIsMobileSidebarOpen(true)}
                                className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                                title="Open navigation menu"
                            >
                                <Lucide.Menu size={20} />
                            </button>
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                {isSidebarCollapsed ? <Lucide.PanelLeftOpen size={19} /> : <Lucide.PanelLeftClose size={19} />}
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline shrink-0">Dnarai</span>
                                    <span className="text-xs text-slate-300 hidden sm:inline shrink-0">/</span>
                                    <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
                                        {activeTab === 'overview' && 'Command Center'}
                                        {activeTab === 'passengers' && 'Passenger Registry'}
                                        {activeTab === 'bookings' && 'Flight Bookings'}
                                        {activeTab === 'invoices' && 'Invoices & Billing'}
                                        {activeTab === 'insights' && 'Travel Insights'}
                                        {activeTab === 'staff' && 'Staff Management'}
                                        {activeTab === 'schedules' && 'Staff Duty Schedules'}
                                        {activeTab === 'duties' && 'Operational Duty Tasks'}
                                        {activeTab === 'alerts' && 'System Alerts'}
                                    </span>
                                    {activeTab === 'passengers' && (
                                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-ocean-50 text-ocean-700 rounded-md border border-ocean-100 hidden xs:inline-flex shrink-0">
                                            {filteredPassengers.length} Total
                                        </span>
                                    )}
                                    {activeTab === 'bookings' && (
                                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 hidden xs:inline-flex shrink-0">
                                            {bookings.length} Flights
                                        </span>
                                    )}
                                    {activeTab === 'invoices' && (
                                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-100 hidden xs:inline-flex shrink-0">
                                            {invoices.length} Invoices
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Center: Clean Section Tabs */}
                        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                            {[
                                { id: 'overview', label: 'Command Center', icon: Lucide.LayoutDashboard },
                                { id: 'passengers', label: 'Passengers', icon: Lucide.Users },
                                { id: 'bookings', label: 'Bookings', icon: Lucide.PlaneTakeoff },
                                { id: 'invoices', label: 'Invoices', icon: Lucide.Receipt },
                                { id: 'alerts', label: 'Alerts', icon: Lucide.Bell, badge: stats.pendingNotifications },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); if (tab.id === 'passengers') setActiveView('all'); }}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                                        activeTab === tab.id
                                            ? "bg-white text-ocean-700 shadow-xs font-semibold"
                                            : "text-slate-500 hover:text-slate-900 font-medium"
                                    )}
                                >
                                    <tab.icon size={13} />
                                    <span>{tab.label}</span>
                                    {tab.badge > 0 && (
                                        <span className="h-4 w-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Right: Actions Menu, Notifications & Sign Out */}
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
                            {/* Push Notification Onboarding & Status Toggle */}
                            <PushNotificationToggle compact />

                            {/* Quick Action Dropdown */}
                            <div className="relative" ref={quickActionsRef}>
                                <button
                                    onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                    className="flex items-center gap-1 sm:gap-2 p-2 sm:px-3.5 sm:py-2 bg-[#00456E] text-white rounded-xl text-xs font-semibold hover:bg-[#0c598a] transition-all shadow-xs active:scale-95"
                                    title="Create New Action"
                                >
                                    <Lucide.Plus size={16} />
                                    <span className="hidden sm:inline">New Action</span>
                                    <Lucide.ChevronDown size={14} className={clsx("transition-transform duration-200 hidden xs:inline", isQuickActionsOpen && "rotate-180")} />
                                </button>

                                {isQuickActionsOpen && (
                                    <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Launch Workflow</div>
                                        <button
                                            onClick={() => { setIsCreatePassengerModalOpen(true); setIsQuickActionsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-ocean-700 hover:bg-ocean-50 rounded-xl transition-all text-left"
                                        >
                                            <Lucide.UserPlus size={16} className="text-ocean-600" />
                                            <span>New Passenger</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsCreateReminderModalOpen(true); setIsQuickActionsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all text-left"
                                        >
                                            <Lucide.BellPlus size={16} className="text-amber-600" />
                                            <span>Set Journey Reminder</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsCreateInvoiceModalOpen(true); setIsQuickActionsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all text-left"
                                        >
                                            <Lucide.FileText size={16} className="text-purple-600" />
                                            <span>Generate Invoice</span>
                                        </button>
                                        <button
                                            onClick={() => { navigate('/super-admin/quotations'); setIsQuickActionsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all text-left"
                                        >
                                            <Lucide.Sparkles size={16} className="text-emerald-600" />
                                            <span>Flight Quotations Tool</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsCreateBlogModalOpen(true); setIsQuickActionsOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-ocean-700 hover:bg-ocean-50 rounded-xl transition-all text-left"
                                        >
                                            <Lucide.BookOpen size={16} className="text-ocean-600" />
                                            <span>Publish Insight</span>
                                        </button>
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => { setIsAddStaffModalOpen(true); setIsQuickActionsOpen(false); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all text-left border-t border-slate-100 mt-1 pt-2"
                                            >
                                                <Lucide.Shield size={16} className="text-slate-600" />
                                                <span>Add Staff Member</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Notifications Icon Button */}
                            <button
                                onClick={() => setActiveTab('alerts')}
                                className={clsx(
                                    "relative p-2 sm:p-2.5 rounded-xl border transition-all shrink-0",
                                    activeTab === 'alerts'
                                        ? "bg-ocean-50 border-ocean-200 text-ocean-600"
                                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                )}
                                title="System Alerts"
                            >
                                <Lucide.Bell size={17} />
                                {stats.pendingNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-rose-500 rounded-full text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                                        {stats.pendingNotifications}
                                    </span>
                                )}
                            </button>

                            {/* Flight Quotations Shortcut (Desktop) */}
                            <button
                                onClick={() => navigate('/super-admin/quotations')}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-ocean-300 text-slate-700 hover:text-ocean-700 rounded-xl text-xs font-semibold hover:bg-ocean-50/50 transition-all shrink-0"
                                title="Flight Quotation Comparisons"
                            >
                                <Lucide.PlaneTakeoff size={15} className="text-ocean-600" />
                                <span>Quotations</span>
                            </button>

                            {/* Sign Out */}
                            <button
                                onClick={handleLogout}
                                className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                                title="Sign Out"
                            >
                                <Lucide.LogOut size={17} />
                            </button>
                        </div>
                    </header>

                    {/* Section Content Body */}
                    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl w-full mx-auto space-y-6 flex-1">

                        {/* SECTION 1: OVERVIEW / COMMAND CENTER */}
                        {activeTab === 'overview' && (
                            <div className="space-y-5">
                                {/* Sleek Executive Command Bar */}
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-ocean-700">Live Control Center</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[11px] font-medium text-slate-500">Dnarai Agency Operations</span>
                                        </div>
                                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                                            Operational Overview
                                        </h2>
                                        <p className="text-xs text-slate-500 max-w-xl">
                                            Real-time passenger journey oversight, flight bookings, and billing manifests.
                                        </p>
                                    </div>

                                    {/* Primary Fast Actions */}
                                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto">
                                        <button
                                            onClick={() => setIsCreatePassengerModalOpen(true)}
                                            className="w-full sm:w-auto px-3.5 py-2.5 bg-[#00456E] hover:bg-[#0c598a] text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <Lucide.Plus size={15} />
                                            <span>New Passenger</span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab('bookings'); setIsCreateBookingModalOpen(true); }}
                                            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <Lucide.PlaneTakeoff size={15} className="text-emerald-600" />
                                            <span>New Booking</span>
                                        </button>
                                        <button
                                            onClick={() => setIsCreateInvoiceModalOpen(true)}
                                            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <Lucide.FileText size={15} className="text-purple-600" />
                                            <span>Invoice</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/super-admin/quotations')}
                                            className="w-full sm:w-auto px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            <Lucide.Sparkles size={15} className="text-amber-600" />
                                            <span>Quotes</span>
                                        </button>
                                    </div>
                                </div>

                                {/* KPI Metrics Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                    {[
                                        { label: 'Total Passengers', value: stats.totalPassengers, icon: Lucide.Users, color: 'text-ocean-600', bg: 'bg-ocean-50', subtext: 'Registered clients', onClick: () => { setActiveTab('passengers'); setActiveView('all'); } },
                                        { label: 'Active Bookings', value: stats.activeBookings, icon: Lucide.PlaneTakeoff, color: 'text-emerald-600', bg: 'bg-emerald-50', subtext: 'Upcoming flights', onClick: () => setActiveTab('bookings') },
                                        { label: 'Traveling Today', value: stats.travelingToday, icon: Lucide.CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-50', subtext: 'Current departures', onClick: () => { setActiveTab('passengers'); setActiveView('today'); } },
                                        { label: 'System Alerts', value: stats.pendingNotifications, icon: Lucide.Bell, color: 'text-amber-600', bg: 'bg-amber-50', subtext: 'Pending actions', onClick: () => setActiveTab('alerts') },
                                    ].map(stat => (
                                        <div
                                            key={stat.label}
                                            onClick={stat.onClick}
                                            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group active:scale-98"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={clsx("p-1.5 sm:p-2 rounded-xl transition-transform group-hover:scale-105", stat.bg, stat.color)}>
                                                    <stat.icon size={17} />
                                                </div>
                                                <Lucide.ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                            </div>
                                            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-0.5">{stat.value}</div>
                                            <div className="text-[11px] sm:text-xs font-semibold text-slate-700 truncate">{stat.label}</div>
                                            <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5 truncate">{stat.subtext}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Operational Split: Active Flights (7 cols) + Invoices & Alerts (5 cols) */}
                                <div className="grid lg:grid-cols-12 gap-5">
                                    {/* Left Column: Recent Flight Schedules (7 cols) */}
                                    <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center shrink-0">
                                                        <Lucide.PlaneTakeoff size={16} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Flight Schedules</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium">Recent passenger flight bookings & itineraries</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setActiveTab('bookings'); setIsCreateBookingModalOpen(true); }}
                                                        className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors"
                                                    >
                                                        <Lucide.Plus size={13} />
                                                        <span>Add Flight</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('bookings')}
                                                        className="text-xs font-bold text-slate-500 hover:text-ocean-600 flex items-center gap-0.5"
                                                    >
                                                        <span>All</span>
                                                        <Lucide.ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                {bookings.slice(0, 4).map(b => (
                                                    <div
                                                        key={b._id}
                                                        onClick={() => handleViewBookingDetails(b)}
                                                        className="p-3 rounded-xl border border-slate-100 hover:border-ocean-200 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="h-9 w-9 rounded-xl bg-ocean-700 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                                {b.airlineName?.slice(0, 2) || 'FL'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-slate-900 truncate">
                                                                    {b.airlineName} • <span className="font-mono text-slate-600">{b.flightNumber}</span>
                                                                </div>
                                                                <div className="text-xs font-semibold text-ocean-600 flex items-center gap-1 mt-0.5">
                                                                    <span>{b.origin?.iata || '---'}</span>
                                                                    <Lucide.ArrowRight size={11} className="text-slate-400" />
                                                                    <span>{b.destination?.iata || '---'}</span>
                                                                    {b.seatNumber && (
                                                                        <span className="text-[10px] text-slate-400 font-medium ml-1">Seat {b.seatNumber}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                                                b.status === 'confirmed' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                                                            )}>
                                                                {b.status}
                                                            </span>
                                                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                                                                {b.departureDateTimeUtc ? new Date(b.departureDateTimeUtc).toLocaleDateString() : 'Date TBD'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {bookings.length === 0 && (
                                                    <div className="py-8 text-center">
                                                        <Lucide.PlaneTakeoff size={24} className="mx-auto text-slate-300 mb-2" />
                                                        <p className="text-xs text-slate-500 font-medium">No flight bookings recorded yet</p>
                                                        <button
                                                            onClick={() => { setActiveTab('bookings'); setIsCreateBookingModalOpen(true); }}
                                                            className="mt-2 text-xs font-bold text-ocean-600 hover:underline"
                                                        >
                                                            + Add First Flight
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setActiveTab('bookings')}
                                            className="w-full mt-3.5 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all text-center border border-slate-100"
                                        >
                                            View All Flight Schedules ({bookings.length})
                                        </button>
                                    </div>

                                    {/* Right Column: Invoices & Alerts (5 cols) */}
                                    <div className="lg:col-span-5 space-y-5">
                                        {/* Invoices Snapshot */}
                                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                        <Lucide.Receipt size={16} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Invoices</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium">Billing summary & statements</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setActiveTab('invoices')}
                                                    className="text-xs font-bold text-ocean-600 hover:text-ocean-800 flex items-center gap-0.5"
                                                >
                                                    <span>All</span>
                                                    <Lucide.ChevronRight size={13} />
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {invoices.slice(0, 3).map(inv => (
                                                    <div
                                                        key={inv._id}
                                                        onClick={() => setActiveTab('invoices')}
                                                        className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-slate-900 truncate">#{inv.invoiceNumber}</div>
                                                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{inv.passengerName || 'Client'}</div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-xs font-bold text-ocean-700">{inv.currency || '₦'}{inv.total?.toLocaleString()}</div>
                                                            <span className={clsx(
                                                                "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                                                                inv.isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                            )}>
                                                                {inv.isPaid ? 'Paid' : 'Unpaid'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                                {invoices.length === 0 && (
                                                    <p className="text-center py-4 text-xs text-slate-400 italic">No invoices issued yet</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* System Alerts Feed */}
                                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                        <Lucide.Bell size={16} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">System Alerts</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium">{stats.pendingNotifications} pending items</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setActiveTab('alerts')}
                                                    className="text-xs font-bold text-ocean-600 hover:text-ocean-800 flex items-center gap-0.5"
                                                >
                                                    <span>View Feed</span>
                                                    <Lucide.ChevronRight size={13} />
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {notifications.slice(0, 2).map(n => (
                                                    <div
                                                        key={n.id || n._id}
                                                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5"
                                                    >
                                                        <Lucide.Bell size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-800 truncate">{n.type?.replace('_', ' ')}</div>
                                                            <div className="text-slate-500 text-[11px] line-clamp-1">{n.message}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {notifications.length === 0 && (
                                                    <p className="text-center py-3 text-xs text-slate-400 italic">All caught up! No active alerts.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION 2: PASSENGERS REGISTRY */}
                        {activeTab === 'passengers' && (
                            <div className="space-y-6">
                                {/* Passengers Control Header */}
                                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                                {activeView === 'today' ? 'Traveling Today' : 'Passenger Registry'}
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {activeView === 'today'
                                                    ? `${filteredPassengers.length} passengers traveling on ${new Date(selectedDate).toLocaleDateString()}`
                                                    : `Manage and track ${passengers.length} registered agency travelers`
                                                }
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 xs:grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
                                            <button
                                                onClick={() => setIsCreatePassengerModalOpen(true)}
                                                className="px-3.5 py-2.5 bg-[#00456E] hover:bg-[#0c598a] text-white rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Lucide.Plus size={16} />
                                                <span>New Passenger</span>
                                            </button>
                                            <button
                                                onClick={() => setIsCreateReminderModalOpen(true)}
                                                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Lucide.BellPlus size={16} />
                                                <span>Set Reminder</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/super-admin/quotations')}
                                                className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Lucide.Sparkles size={16} className="text-amber-500" />
                                                <span>Flight Quotes</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filters & Search Toolbar */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        {/* Sub-view switcher tabs */}
                                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/50 w-full sm:w-auto">
                                            <button
                                                onClick={() => setActiveView('all')}
                                                className={clsx(
                                                    "flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                    activeView === 'all'
                                                        ? "bg-white text-ocean-700 shadow-2xs font-bold"
                                                        : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                All Registry ({passengers.length})
                                            </button>
                                            <button
                                                onClick={() => setActiveView('today')}
                                                className={clsx(
                                                    "flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                    activeView === 'today'
                                                        ? "bg-white text-ocean-700 shadow-2xs font-bold"
                                                        : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                Traveling Today ({travelingPassengers.length})
                                            </button>
                                        </div>

                                        {activeView === 'today' && (
                                            <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shrink-0">
                                                <Lucide.Calendar size={16} className="text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={selectedDate}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                    className="text-xs font-bold text-slate-700 focus:outline-none"
                                                />
                                            </div>
                                        )}

                                        {/* Search Input */}
                                        <div className="relative flex-1 w-full max-w-full sm:max-w-md">
                                            <Lucide.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                            <input
                                                type="text"
                                                placeholder="Search by name, email, or passenger ID..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-ocean-500 transition-all"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                                >
                                                    <Lucide.X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Passengers Table / Mobile Cards */}
                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                                    {/* Mobile Cards */}
                                    <div className="block md:hidden divide-y divide-slate-100">
                                        {paginatedPassengers.map(p => (
                                            <div
                                                key={p.id || p._id}
                                                onClick={() => { setSelectedPassenger(p); setIsPassengerDetailsModalOpen(true); }}
                                                className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-11 w-11 rounded-2xl bg-ocean-100 text-ocean-700 font-black text-sm flex items-center justify-center shrink-0 border border-ocean-200">
                                                        {p.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-slate-900 text-sm truncate">{p.fullName}</div>
                                                        <div className="text-xs text-slate-500 truncate">{p.email}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ID: {(p.id || p._id)?.slice(-8).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTravelCardPassengerId(p.id || p._id);
                                                            setActiveTab('travel-card');
                                                        }}
                                                        className="p-2 text-ocean-600 hover:bg-ocean-50 rounded-xl transition-all"
                                                        title="Generate Travel Card"
                                                    >
                                                        <Lucide.CreditCard size={18} />
                                                    </button>
                                                    <Lucide.ChevronRight size={18} className="text-slate-300" />
                                                </div>
                                            </div>
                                        ))}
                                        {filteredPassengers.length === 0 && (
                                            <div className="p-12 text-center text-slate-400 italic text-xs">No passengers match your search criteria.</div>
                                        )}
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50/70 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Traveler</th>
                                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                                                    {activeView === 'today' && (
                                                        <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Flight</th>
                                                    )}
                                                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedPassengers.map(p => (
                                                    <tr
                                                        key={p.id || p._id}
                                                        onClick={() => { setSelectedPassenger(p); setIsPassengerDetailsModalOpen(true); }}
                                                        className="group cursor-pointer hover:bg-ocean-50/40 transition-colors"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-ocean-100 text-ocean-700 font-black text-xs flex items-center justify-center border border-ocean-200 shadow-xs shrink-0">
                                                                    {p.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm group-hover:text-ocean-700 transition-colors">{p.fullName}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID: {(p.id || p._id)?.slice(-8).toUpperCase()}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-semibold text-slate-800">{p.email}</div>
                                                            <div className="text-[11px] text-slate-400 mt-0.5">{p.phone || 'No phone recorded'}</div>
                                                        </td>
                                                        {activeView === 'today' && (
                                                            <td className="px-6 py-4">
                                                                {p.bookings && p.bookings.length > 0 ? (
                                                                    <div
                                                                        onClick={(e) => { e.stopPropagation(); handleViewBookingDetails(p.bookings[0]); }}
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ocean-50 text-ocean-700 border border-ocean-200/60 hover:bg-ocean-100 transition-all"
                                                                    >
                                                                        <span className="font-bold text-xs">{p.bookings[0].flightNumber}</span>
                                                                        <span className="text-[10px] font-medium text-ocean-600">({p.bookings[0].origin?.iata} → {p.bookings[0].destination?.iata})</span>
                                                                        <Lucide.ExternalLink size={12} className="text-ocean-400" />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">No flight scheduled</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTravelCardPassengerId(p.id || p._id);
                                                                        setActiveTab('travel-card');
                                                                    }}
                                                                    className="p-2 text-slate-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-all"
                                                                    title="Generate Travel Card"
                                                                >
                                                                    <Lucide.CreditCard size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedPassenger(p); setIsPassengerDetailsModalOpen(true); }}
                                                                    className="p-2 text-slate-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-all"
                                                                    title="View Traveler Details"
                                                                >
                                                                    <Lucide.Eye size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditForm(p); setIsEditModalOpen(true); }}
                                                                    className="p-2 text-slate-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-all"
                                                                    title="Edit Passenger Profile"
                                                                >
                                                                    <Lucide.Edit size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ passenger: p }); }}
                                                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                                    title="Delete Passenger Record"
                                                                >
                                                                    <Lucide.Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredPassengers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={activeView === 'today' ? 4 : 3} className="px-6 py-16 text-center text-slate-400 italic text-xs">
                                                            No passenger accounts match your search.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                                            <div className="text-xs font-semibold text-slate-500">
                                                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
                                                <span className="font-bold text-slate-900">{Math.min(endIndex, filteredPassengers.length)}</span> of{' '}
                                                <span className="font-bold text-slate-900">{filteredPassengers.length}</span> passengers
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    disabled={passengerPage === 1}
                                                    onClick={() => setPassengerPage(prev => Math.max(prev - 1, 1))}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition-all"
                                                >
                                                    <Lucide.ChevronLeft size={16} />
                                                </button>
                                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(num => (
                                                    <button
                                                        key={num}
                                                        onClick={() => setPassengerPage(num)}
                                                        className={clsx(
                                                            "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                                                            passengerPage === num
                                                                ? "bg-ocean-600 text-white shadow-xs"
                                                                : "border border-slate-200 text-slate-600 hover:bg-white"
                                                        )}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                                <button
                                                    disabled={passengerPage === totalPages}
                                                    onClick={() => setPassengerPage(prev => Math.min(prev + 1, totalPages))}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition-all"
                                                >
                                                    <Lucide.ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SECTION 3: FLIGHT BOOKINGS */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-6">
                                {/* Bookings Control Header */}
                                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Flight Bookings</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Manage confirmed flights, itineraries, PNR references, and tickets</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 w-full sm:w-auto">
                                            <button
                                                onClick={() => setBookingFilter('recent')}
                                                className={clsx(
                                                    "flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                    bookingFilter === 'recent' ? "bg-white text-ocean-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                Recent Flights
                                            </button>
                                            <button
                                                onClick={() => setBookingFilter('all')}
                                                className={clsx(
                                                    "flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                    bookingFilter === 'all' ? "bg-white text-ocean-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                                                )}
                                            >
                                                All History ({bookings.length})
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => navigate('/super-admin/quotations')}
                                            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Lucide.Sparkles size={16} className="text-amber-500" />
                                            <span>Flight Quotes</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Bookings List Grid */}
                                <div className="grid gap-4">
                                    {paginatedBookings.map(b => (
                                        <div
                                            key={b._id}
                                            onClick={() => handleViewBookingDetails(b)}
                                            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-ocean-300 hover:shadow-lg transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-black tracking-wider uppercase shadow-md shrink-0">
                                                        {b.airlineName?.slice(0, 2).toUpperCase() || 'FL'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-slate-900 text-sm sm:text-base truncate">{b.airlineName}</div>
                                                        <div className="text-xs font-bold text-ocean-600 font-mono tracking-wide">{b.flightNumber}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                                                    <span className={clsx(
                                                        "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider",
                                                        b.status === 'confirmed' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    )}>
                                                        {b.status}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditBookingModal(b); }}
                                                            className="p-2 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-xl transition-all"
                                                            title="Edit Itinerary"
                                                        >
                                                            <Lucide.Edit size={16} />
                                                        </button>
                                                        <div className="p-2 text-slate-400 group-hover:text-ocean-600 transition-colors">
                                                            <Lucide.ArrowRight size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Route & Flight Visual Strip */}
                                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                                                    <div>
                                                        <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">{b.origin?.iata || '---'}</div>
                                                        <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[100px] sm:max-w-none">{b.origin?.city || 'Origin'}</div>
                                                    </div>
                                                    <div className="flex flex-col items-center px-2 sm:px-4">
                                                        <Lucide.Plane size={18} className="text-ocean-500" />
                                                        <div className="w-12 sm:w-16 h-0.5 bg-ocean-200 mt-1 hidden sm:block"></div>
                                                    </div>
                                                    <div className="text-right sm:text-left">
                                                        <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">{b.destination?.iata || '---'}</div>
                                                        <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[100px] sm:max-w-none">{b.destination?.city || 'Destination'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-semibold text-slate-600 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200">
                                                    <div>
                                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block">Departure</span>
                                                        <span className="text-xs">{new Date(b.departureDateTimeUtc).toLocaleDateString()} {b.departureTime24 ? `at ${b.departureTime24}` : ''}</span>
                                                    </div>
                                                    {b.bookingReference && (
                                                        <div>
                                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block">PNR</span>
                                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 text-xs">{b.bookingReference}</span>
                                                        </div>
                                                    )}
                                                    {b.ticketNumber && (
                                                        <div>
                                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ticket</span>
                                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 text-xs">{b.ticketNumber}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {displayedBookings.length === 0 && (
                                        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
                                            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                                                <Lucide.PlaneTakeoff size={32} />
                                            </div>
                                            <h3 className="font-bold text-slate-800 mb-1">No bookings found</h3>
                                            <p className="text-xs text-slate-400">Flight bookings added to passengers will appear here.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalBookingPages > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200">
                                        <div className="text-xs font-semibold text-slate-500">
                                            Showing <span className="font-bold text-slate-900">{(bookingPage - 1) * BOOKINGS_PER_PAGE + 1}</span> to{' '}
                                            <span className="font-bold text-slate-900">{Math.min(bookingPage * BOOKINGS_PER_PAGE, displayedBookings.length)}</span> of{' '}
                                            <span className="font-bold text-slate-900">{displayedBookings.length}</span> bookings
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                disabled={bookingPage === 1}
                                                onClick={() => setBookingPage(prev => Math.max(prev - 1, 1))}
                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                <Lucide.ChevronLeft size={16} />
                                            </button>
                                            {Array.from({ length: totalBookingPages }, (_, i) => i + 1).map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => setBookingPage(num)}
                                                    className={clsx(
                                                        "h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all border",
                                                        bookingPage === num ? "bg-ocean-600 border-ocean-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                            <button
                                                disabled={bookingPage === totalBookingPages}
                                                onClick={() => setBookingPage(prev => Math.min(prev + 1, totalBookingPages))}
                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                <Lucide.ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION 4: INVOICES & BILLING */}
                        {activeTab === 'invoices' && (
                            <div className="space-y-6">
                                {/* Invoices Metric Strip */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Total Invoices</div>
                                            <div className="text-xl sm:text-2xl font-black text-slate-900">{invoices.length}</div>
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-2 truncate">Issued travel documents</div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Billed Revenue</div>
                                            <div className="text-xl sm:text-2xl font-black text-ocean-600 truncate">
                                                {invoices[0]?.currency || '₦'}{totalBilledRevenue.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-2 truncate">Net bookings (excl. fee)</div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Profit / Fee</div>
                                            <div className="text-xl sm:text-2xl font-black text-amber-600 truncate">
                                                {invoices[0]?.currency || '₦'}{totalServiceChargeProfit.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-2 truncate">Agency earned fee &amp; profit</div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">Payment Status</div>
                                            <div className="text-xl sm:text-2xl font-black text-emerald-600">
                                                {paidInvoicesCount} <span className="text-xs sm:text-sm font-bold text-emerald-700">Paid</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] sm:text-[11px] text-slate-500 mt-2 truncate">
                                            {invoices.length - paidInvoicesCount} Pending / Unpaid
                                        </div>
                                    </div>
                                </div>

                                {/* Invoices Table Card */}
                                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                                    <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-ocean-50 text-ocean-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                                <Lucide.Receipt size={22} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight font-display">Invoice History</h2>
                                                <p className="text-xs text-slate-500 font-medium">Issue, download, share, edit status, and track passenger billing</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
                                            {invoices.length > 0 && (
                                                <button
                                                    onClick={handleDeleteAllInvoices}
                                                    className="p-2.5 sm:px-3.5 sm:py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-all border border-rose-100"
                                                    title="Purge All Invoices"
                                                >
                                                    <Lucide.Trash2 size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setIsCreateInvoiceModalOpen(true)}
                                                className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2.5 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-ocean-600/20 active:scale-95"
                                            >
                                                <Lucide.Plus size={16} />
                                                <span>New Invoice</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50/70 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Document &amp; Status</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recipient</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount &amp; Breakdown</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedInvoices.map(inv => {
                                                    const isPaid = Boolean(inv.isPaid || inv.status === 'paid' || (inv.balanceDue === 0 && Number(inv.total) > 0));
                                                    const netBilled = inv.subTotal !== undefined ? inv.subTotal : Math.max(0, (inv.total || 0) - (inv.serviceCharge || 0));
                                                    return (
                                                        <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                                        <Lucide.FileText size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-slate-900 text-sm">#{inv.invoiceNumber}</div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(inv.date).toLocaleDateString()}</span>
                                                                            {isPaid ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                    <Lucide.CheckCircle2 size={11} className="text-emerald-600" /> Paid
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                                                                    <Lucide.Clock size={11} className="text-amber-600" /> Unpaid
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-bold text-slate-800">{inv.passengerName}</div>
                                                                <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">{inv.passengerEmail}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="text-sm font-black text-ocean-600">{inv.currency}{inv.total?.toLocaleString()}</div>
                                                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                    <span>Net: {inv.currency}{netBilled.toLocaleString()}</span>
                                                                    {Number(inv.serviceCharge) > 0 && (
                                                                        <span className="text-amber-600 font-bold ml-1.5">+ {inv.currency}{Number(inv.serviceCharge).toLocaleString()} fee</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 uppercase font-black tracking-tight opacity-75 mt-0.5">
                                                                    {inv.paymentType?.replace('_', ' ')}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end items-center gap-1.5 opacity-85 group-hover:opacity-100 transition-all">
                                                                    {/* Quick Status Toggle Button */}
                                                                    {isPaid ? (
                                                                        <button
                                                                            onClick={() => handleToggleInvoicePaid(inv)}
                                                                            className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition-all border border-amber-200 text-xs font-bold flex items-center gap-1"
                                                                            title="Change status to Unpaid"
                                                                        >
                                                                            <Lucide.RotateCcw size={13} />
                                                                            <span>Set Unpaid</span>
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleToggleInvoicePaid(inv)}
                                                                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-1 shadow-xs"
                                                                            title="Change status to Paid"
                                                                        >
                                                                            <Lucide.CheckCircle2 size={13} />
                                                                            <span>Mark Paid</span>
                                                                        </button>
                                                                    )}

                                                                    {/* Edit Invoice Button */}
                                                                    <button
                                                                        onClick={() => openEditInvoiceModal(inv)}
                                                                        className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
                                                                        title="Edit Invoice Details &amp; Payment Status"
                                                                    >
                                                                        <Lucide.Edit size={16} />
                                                                    </button>

                                                                    {/* Share Invoice */}
                                                                    <button
                                                                        onClick={() => { setSelectedInvoiceForShare(inv); setIsShareInvoiceModalOpen(true); }}
                                                                        className="p-2 bg-ocean-50 text-ocean-600 rounded-xl hover:bg-ocean-100 transition-all"
                                                                        title="Share via WhatsApp or Email"
                                                                    >
                                                                        <Lucide.Share2 size={16} />
                                                                    </button>

                                                                    {/* Download PDF */}
                                                                    <button
                                                                        onClick={() => handleDownloadInvoice(inv)}
                                                                        className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                                                                        title="Download PDF Document"
                                                                    >
                                                                        <Lucide.Download size={16} />
                                                                    </button>

                                                                    {/* Delete Invoice */}
                                                                    <button
                                                                        onClick={() => handleDeleteInvoice(inv._id)}
                                                                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                                                        title="Delete Permanently"
                                                                    >
                                                                        <Lucide.Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {invoices.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-16 text-center text-slate-400 italic text-xs">
                                                            No invoices issued yet. Click &quot;New Invoice&quot; to generate one.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden divide-y divide-slate-100">
                                        {paginatedInvoices.map(inv => {
                                            const isPaid = Boolean(inv.isPaid || inv.status === 'paid' || (inv.balanceDue === 0 && Number(inv.total) > 0));
                                            const netBilled = inv.subTotal !== undefined ? inv.subTotal : Math.max(0, (inv.total || 0) - (inv.serviceCharge || 0));
                                            return (
                                                <div key={inv._id} className="p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-900 text-sm">#{inv.invoiceNumber}</span>
                                                                {isPaid ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        Paid
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                                                        Unpaid
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-600 font-semibold mt-0.5">{inv.passengerName}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-ocean-600">{inv.currency}{inv.total?.toLocaleString()}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium">
                                                                Net: {inv.currency}{netBilled.toLocaleString()}
                                                                {Number(inv.serviceCharge) > 0 && <span className="text-amber-600 font-bold ml-1">+{inv.currency}{Number(inv.serviceCharge).toLocaleString()} fee</span>}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">{new Date(inv.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 pt-1">
                                                        <div className="flex items-center gap-2">
                                                            {isPaid ? (
                                                                <button
                                                                    onClick={() => handleToggleInvoicePaid(inv)}
                                                                    className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                                                >
                                                                    <Lucide.RotateCcw size={14} />
                                                                    <span>Set Unpaid</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleToggleInvoicePaid(inv)}
                                                                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                                                                >
                                                                    <Lucide.CheckCircle2 size={14} />
                                                                    <span>Mark Paid</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openEditInvoiceModal(inv)}
                                                                className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
                                                                title="Edit Invoice"
                                                            >
                                                                <Lucide.Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteInvoice(inv._id)}
                                                                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                                                                title="Delete Permanently"
                                                            >
                                                                <Lucide.Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => { setSelectedInvoiceForShare(inv); setIsShareInvoiceModalOpen(true); }}
                                                                className="py-2 bg-ocean-50 hover:bg-ocean-100 text-ocean-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                                            >
                                                                <Lucide.Share2 size={14} />
                                                                <span>Share</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadInvoice(inv)}
                                                                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                                            >
                                                                <Lucide.Download size={14} />
                                                                <span>PDF</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination */}
                                    {totalInvoicePages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                                            <div className="text-xs font-semibold text-slate-500">
                                                Showing <span className="font-bold text-slate-900">{(invoicePage - 1) * INVOICES_PER_PAGE + 1}</span> to{' '}
                                                <span className="font-bold text-slate-900">{Math.min(invoicePage * INVOICES_PER_PAGE, invoices.length)}</span> of{' '}
                                                <span className="font-bold text-slate-900">{invoices.length}</span> invoices
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    disabled={invoicePage === 1}
                                                    onClick={() => setInvoicePage(prev => Math.max(prev - 1, 1))}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
                                                >
                                                    <Lucide.ChevronLeft size={16} />
                                                </button>
                                                {Array.from({ length: totalInvoicePages }, (_, i) => i + 1).map(num => (
                                                    <button
                                                        key={num}
                                                        onClick={() => setInvoicePage(num)}
                                                        className={clsx(
                                                            "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                                                            invoicePage === num ? "bg-ocean-600 text-white shadow-xs" : "border border-slate-200 text-slate-600 hover:bg-white"
                                                        )}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                                <button
                                                    disabled={invoicePage === totalInvoicePages}
                                                    onClick={() => setInvoicePage(prev => Math.min(prev + 1, totalInvoicePages))}
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
                                                >
                                                    <Lucide.ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SECTION 5: INSIGHTS & BLOG */}
                        {activeTab === 'insights' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight font-display">Travel Insights & Blog</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Publish articles, travel requirements, updates, and airport guides</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreateBlogModalOpen(true)}
                                        className="px-5 py-2.5 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-ocean-600/20 active:scale-95 flex items-center gap-2 shrink-0"
                                    >
                                        <Lucide.Plus size={16} />
                                        <span>New Insight</span>
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    {paginatedBlogs.map(blog => (
                                        <div key={blog._id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-ocean-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-ocean-50 text-ocean-700 border border-ocean-100">Insight</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(blog.createdAt || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                                <h3 className="font-black text-slate-900 text-base mb-1 truncate">{blog.title}</h3>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{blog.content?.replace(/<[^>]*>?/gm, '')}</p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                                <button
                                                    onClick={() => setEditingBlog(blog)}
                                                    className="px-3.5 py-2 bg-slate-100 hover:bg-ocean-50 text-slate-700 hover:text-ocean-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <Lucide.Edit size={14} />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBlog(blog._id)}
                                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all"
                                                    title="Delete Article"
                                                >
                                                    <Lucide.Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {blogs.length === 0 && (
                                        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
                                            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                                                <Lucide.BookOpen size={32} />
                                            </div>
                                            <h3 className="font-bold text-slate-800 mb-1">No articles published yet</h3>
                                            <p className="text-xs text-slate-400 mb-4">Click &quot;New Insight&quot; to create your first article or travel advisory.</p>
                                            <button
                                                onClick={() => setIsCreateBlogModalOpen(true)}
                                                className="px-5 py-2.5 bg-ocean-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                            >
                                                Publish Article
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {totalInsightPages > 1 && (
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                                        <div className="text-xs font-semibold text-slate-500">
                                            Page <span className="font-bold text-slate-900">{insightPage}</span> of <span className="font-bold text-slate-900">{totalInsightPages}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={insightPage === 1}
                                                onClick={() => setInsightPage(prev => Math.max(prev - 1, 1))}
                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                                            >
                                                <Lucide.ChevronLeft size={16} />
                                            </button>
                                            <button
                                                disabled={insightPage === totalInsightPages}
                                                onClick={() => setInsightPage(prev => Math.min(prev + 1, totalInsightPages))}
                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                                            >
                                                <Lucide.ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION 6: STAFF MANAGEMENT (Admin Only) */}
                        {activeTab === 'staff' && role === 'admin' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight font-display">Staff & Team Management</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Control agency administrative access, roles, and credentials</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                            <input
                                                type="text"
                                                placeholder="Filter staff members..."
                                                value={staffSearchQuery}
                                                onChange={e => setStaffSearchQuery(e.target.value)}
                                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setIsAddStaffModalOpen(true)}
                                            className="px-4 py-2 bg-ocean-600 hover:bg-ocean-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-ocean-600/20 active:scale-95 shrink-0"
                                        >
                                            <Lucide.UserPlus size={16} />
                                            <span>Add Staff</span>
                                        </button>
                                    </div>
                                </div>

                                {staffActionFeedback && (
                                    <div className={clsx(
                                        "p-4 rounded-2xl text-xs font-bold border flex items-center justify-between",
                                        staffActionFeedback.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                                    )}>
                                        <span>{staffActionFeedback.message}</span>
                                        <button onClick={() => setStaffActionFeedback(null)} className="text-slate-400 hover:text-slate-600">
                                            <Lucide.X size={14} />
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50/70 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Member</th>
                                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredStaff.map(member => (
                                                    <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-[#00456E] text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                                                                    {member.email?.[0] || 'U'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm">{member.email}</div>
                                                                    <div className="text-[10px] text-slate-400 font-semibold">Added {new Date(member.createdAt || Date.now()).toLocaleDateString()}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                                member.role === 'admin' ? "bg-ocean-100 text-ocean-800 border border-ocean-200" : "bg-slate-100 text-slate-700"
                                                            )}>
                                                                {member.role === 'admin' ? 'Super Admin' : 'Staff Agent'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    disabled={resendingStaffId === member._id}
                                                                    onClick={() => handleResendStaffCredentials(member._id, member.email)}
                                                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                    {resendingStaffId === member._id ? (
                                                                        <Lucide.RefreshCw size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <Lucide.Mail size={13} />
                                                                    )}
                                                                    <span>Resend Login</span>
                                                                </button>
                                                                <button
                                                                    disabled={deletingStaffId === member._id || member.email === currentAdminEmail}
                                                                    onClick={() => handleDeleteStaff(member._id, member.email)}
                                                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all disabled:opacity-30"
                                                                    title={member.email === currentAdminEmail ? "Cannot delete own account" : "Remove Staff Access"}
                                                                >
                                                                    <Lucide.Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredStaff.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                                                            No staff accounts found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION: STAFF SCHEDULES (Admin Only) */}
                        {activeTab === 'schedules' && role === 'admin' && (
                            <SpreadsheetScheduleView
                                staffMembers={staffMembers}
                                onReloadStaff={loadStaffMembers}
                            />
                        )}

                        {/* SECTION: DUTY ASSIGNMENTS & LEDGER (Admin Only) */}
                        {activeTab === 'duties' && role === 'admin' && (
                            <DutyManagementView
                                staffMembers={staffMembers}
                            />
                        )}

                        {/* SECTION: TRAVEL CARD GENERATOR */}
                        {activeTab === 'travel-card' && (
                            <TravelCardManager
                                passengers={passengers}
                                bookings={bookings}
                                initialPassengerId={travelCardPassengerId}
                                onClose={() => setActiveTab('overview')}
                            />
                        )}

                        {/* SECTION 7: SYSTEM ALERTS */}
                        {activeTab === 'alerts' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight font-display">System Notifications</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">{stats.pendingNotifications} pending items requiring administrative review</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                        >
                                            Mark All Read
                                        </button>
                                        <button
                                            onClick={handleClearAllNotifications}
                                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-rose-100"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {notifications.map(note => (
                                        <div
                                            key={note.id || note._id}
                                            onClick={() => handleMarkAsRead(note.id || note._id)}
                                            className={clsx(
                                                "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4",
                                                note.read ? "bg-white border-slate-200 opacity-75" : "bg-white border-ocean-300 shadow-sm"
                                            )}
                                        >
                                            <div className={clsx(
                                                "p-2.5 rounded-xl shrink-0 mt-0.5",
                                                note.type === 'unrecognized_booking' ? "bg-amber-100 text-amber-800" : "bg-ocean-100 text-ocean-800"
                                            )}>
                                                {note.type === 'unrecognized_booking' ? <Lucide.UserPlus size={18} /> : <Lucide.Bell size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-ocean-600 bg-ocean-50 px-2 py-0.5 rounded-md">
                                                        {note.type?.replace('_', ' ')}
                                                    </span>
                                                    {!note.read && (
                                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs md:text-sm font-semibold text-slate-800 leading-relaxed">{note.message}</p>
                                                {note.createdAt && (
                                                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                                                        {new Date(note.createdAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
                                            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                                                <Lucide.Bell size={32} />
                                            </div>
                                            <h3 className="font-bold text-slate-800 mb-1">No alerts</h3>
                                            <p className="text-xs text-slate-400">All alerts and notifications will be listed here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* Modals */}
            {onboardingSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                                <Lucide.CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Passenger Created!</h2>
                            <p className="text-sm text-slate-600">Account credentials have been sent via email</p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-6 space-y-3">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Name</div>
                                <div className="text-sm font-bold text-slate-900">{onboardingSuccess.passenger.fullName}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Email</div>
                                <div className="text-sm font-medium text-slate-900">{onboardingSuccess.passenger.email}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Temporary Password</div>
                                <div className="text-sm font-mono font-bold text-ocean-600 bg-ocean-50 px-3 py-2 rounded-lg">
                                    {onboardingSuccess.tempPassword}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setOnboardingSuccess(null)}
                            className="w-full bg-ocean-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-ocean-700 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}



            <Modal
                open={isCreatePassengerModalOpen}
                title="Create New Passenger"
                onClose={() => setIsCreatePassengerModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsCreatePassengerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <ActionButton
                            onClick={handleCreatePassenger}
                            loadingMessage="Creating..."
                            successMessage="Passenger Created"
                        >
                            Create
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleCreatePassenger} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                        <input type="text" required value={createPassengerForm.fullName} onChange={e => setCreatePassengerForm({ ...createPassengerForm, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                        <input type="email" required value={createPassengerForm.email} onChange={e => setCreatePassengerForm({ ...createPassengerForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Phone (Optional)</label>
                        <input type="tel" value={createPassengerForm.phone} onChange={e => setCreatePassengerForm({ ...createPassengerForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                </form>
            </Modal>

            <Modal
                open={isCreateBookingModalOpen}
                title="Add Flight Booking"
                onClose={() => setIsCreateBookingModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsCreateBookingModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <ActionButton
                            onClick={handleCreateBooking}
                            loadingMessage="Creating..."
                            successMessage="Sync Complete"
                        >
                            Create Booking
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Airline</label>
                            <input type="text" required value={createBookingForm.airlineName} onChange={e => setCreateBookingForm({ ...createBookingForm, airlineName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Flight Number</label>
                            <input type="text" required value={createBookingForm.flightNumber} onChange={e => setCreateBookingForm({ ...createBookingForm, flightNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AirportAutocomplete
                            label="Origin"
                            initialCity={createBookingForm.originCity}
                            initialIata={createBookingForm.originIata}
                            onChange={(val) => setCreateBookingForm({ ...createBookingForm, originCity: val, originIata: '' })}
                            onSelect={(airport) => setCreateBookingForm({
                                ...createBookingForm,
                                originCity: airport.city,
                                originIata: airport.iata
                            })}
                        />
                        <AirportAutocomplete
                            label="Destination"
                            initialCity={createBookingForm.destCity}
                            initialIata={createBookingForm.destIata}
                            onChange={(val) => setCreateBookingForm({ ...createBookingForm, destCity: val, destIata: '' })}
                            onSelect={(airport) => setCreateBookingForm({
                                ...createBookingForm,
                                destCity: airport.city,
                                destIata: airport.iata
                            })}
                        />
                    </div>

                    {/* Hidden inputs to maintain required check integrity if needed, or we rely on state check in handler */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Booking Reference (PNR)</label>
                            <input
                                type="text"
                                value={createBookingForm.bookingReference}
                                onChange={e => setCreateBookingForm({ ...createBookingForm, bookingReference: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono uppercase"
                                placeholder="e.g. XJ59LZ"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Ticket Number</label>
                            <input
                                type="text"
                                value={createBookingForm.ticketNumber}
                                onChange={e => setCreateBookingForm({ ...createBookingForm, ticketNumber: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono"
                                placeholder="e.g. 176-238471923"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Departure Date</label>
                            <input type="date" required value={createBookingForm.departureDate} onChange={e => setCreateBookingForm({ ...createBookingForm, departureDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Departure Time</label>
                            <input type="time" required value={createBookingForm.departureTime} onChange={e => setCreateBookingForm({ ...createBookingForm, departureTime: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal
                open={isCreateReminderModalOpen}
                title="Set Journey Reminder (No Account)"
                onClose={() => setIsCreateReminderModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsCreateReminderModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <ActionButton
                            onClick={handleCreateReminder}
                            loadingMessage="Scheduling..."
                            successMessage="Reminder Set"
                        >
                            Set Reminder
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleCreateReminder} className="p-6 space-y-4">
                    <div className="border-b border-slate-100 pb-4 mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Passenger Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                <input type="text" required value={reminderForm.fullName} onChange={e => setReminderForm({ ...reminderForm, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                <input type="email" required value={reminderForm.email} onChange={e => setReminderForm({ ...reminderForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" placeholder="e.g. john@example.com" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number (Optional)</label>
                            <input type="tel" value={reminderForm.phone} onChange={e => setReminderForm({ ...reminderForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" placeholder="e.g. +234..." />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Flight Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Airline</label>
                                <input type="text" required value={reminderForm.airlineName} onChange={e => setReminderForm({ ...reminderForm, airlineName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" placeholder="e.g. Qatar Airways" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Flight Number</label>
                                <input type="text" required value={reminderForm.flightNumber} onChange={e => setReminderForm({ ...reminderForm, flightNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" placeholder="e.g. QR 1308" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <AirportAutocomplete
                                label="Origin"
                                initialCity={reminderForm.originCity}
                                initialIata={reminderForm.originIata}
                                onChange={(val) => setReminderForm({ ...reminderForm, originCity: val, originIata: '' })}
                                onSelect={(airport) => setReminderForm({
                                    ...reminderForm,
                                    originCity: airport.city,
                                    originIata: airport.iata
                                })}
                            />
                            <AirportAutocomplete
                                label="Destination"
                                initialCity={reminderForm.destCity}
                                initialIata={reminderForm.destIata}
                                onChange={(val) => setReminderForm({ ...reminderForm, destCity: val, destIata: '' })}
                                onSelect={(airport) => setReminderForm({
                                    ...reminderForm,
                                    destCity: airport.city,
                                    destIata: airport.iata
                                })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Booking Reference (PNR)</label>
                                <input
                                    type="text"
                                    value={reminderForm.bookingReference}
                                    onChange={e => setReminderForm({ ...reminderForm, bookingReference: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono uppercase"
                                    placeholder="e.g. XJ59LZ"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Ticket Number</label>
                                <input
                                    type="text"
                                    value={reminderForm.ticketNumber}
                                    onChange={e => setReminderForm({ ...reminderForm, ticketNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono"
                                    placeholder="e.g. 176-238471923"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Departure Date</label>
                                <input type="date" required value={reminderForm.departureDate} onChange={e => setReminderForm({ ...reminderForm, departureDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Departure Time</label>
                                <input type="time" required value={reminderForm.departureTime} onChange={e => setReminderForm({ ...reminderForm, departureTime: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal
                open={isEditModalOpen}
                title="Edit Passenger"
                onClose={() => setIsEditModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <ActionButton
                            onClick={handleUpdatePassenger}
                            loadingMessage="Saving..."
                            successMessage="Profile Saved"
                        >
                            Save Changes
                        </ActionButton>
                    </div>
                }
            >
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                        <input type="text" value={editForm.fullName || ''} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                        <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                        <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                    </div>
                </div>
            </Modal>

            <Modal
                open={isPassengerDetailsModalOpen}
                title="Passenger Profile Details"
                onClose={() => setIsPassengerDetailsModalOpen(false)}
                footer={
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setIsPassengerDetailsModalOpen(false);
                                    setTravelCardPassengerId(selectedPassenger.id || selectedPassenger._id);
                                    setActiveTab('travel-card');
                                }}
                                className="py-2.5 px-2 sm:px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                title="Open visual travel itinerary card"
                            >
                                <Lucide.CreditCard size={15} />
                                <span className="truncate">Card</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsPassengerDetailsModalOpen(false);
                                    setIsCreateBookingModalOpen(true);
                                }}
                                className="py-2.5 px-2 sm:px-4 bg-ocean-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-ocean-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <Lucide.Plus size={15} />
                                <span className="truncate">Flight</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditForm(selectedPassenger);
                                    setIsEditModalOpen(true);
                                }}
                                className="py-2.5 px-2 sm:px-4 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-50 transition-all shadow-xs text-center"
                            >
                                <span className="truncate">Edit</span>
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setDeleteConfirmation({ passenger: selectedPassenger });
                            }}
                            className="w-full sm:w-auto py-2.5 px-4 bg-rose-50 text-rose-600 rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-100 transition-all border border-rose-100/50 text-center"
                        >
                            Delete Passenger
                        </button>
                    </div>
                }
            >
                {selectedPassenger && (
                    <div className="space-y-6 py-2">
                        {/* Passenger Hero Header */}
                        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                            <div className="h-20 w-20 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-2xl font-black mb-4 border-2 border-white shadow-md ring-4 ring-ocean-50">
                                {selectedPassenger.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedPassenger.fullName}</h3>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200/50">
                                <Lucide.ShieldCheck size={12} className="text-ocean-600" />
                                <span>Passenger ID: {(selectedPassenger.id || selectedPassenger._id)?.slice(-8).toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Contact Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <div className="p-2 bg-ocean-50 text-ocean-600 rounded-xl shrink-0">
                                    <Lucide.Mail size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address</div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 break-all mt-0.5">{selectedPassenger.email}</div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-xl shrink-0">
                                        <Lucide.Phone size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone Number</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{selectedPassenger.phone || 'Not provided'}</div>
                                    </div>
                                </div>
                                {selectedPassenger.phone && (
                                    <a
                                        href={`https://wa.me/${(selectedPassenger.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello%20${encodeURIComponent(selectedPassenger.fullName)}%20This%20is%20a%20representative%20from%20Dnarai%20Enterprise.`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-all self-center shadow-sm"
                                        title="Send WhatsApp Message"
                                    >
                                        <Lucide.MessageSquare size={16} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Passport Details Card */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50 rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 dark:border-slate-800 pb-3">
                                <Lucide.FileText className="text-ocean-600 shrink-0" size={18} />
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Passport Credentials</h4>
                            </div>
                            
                            {selectedPassenger.documentNumberFull || selectedPassenger.passportName ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name on Passport</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPassenger.passportName || 'Not provided'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Passport Number</div>
                                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 uppercase">{selectedPassenger.documentNumberFull || 'Not provided'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Country of Issue</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPassenger.passportCountryIssue || 'Not provided'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date of Birth (DOB)</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {selectedPassenger.passportDob ? new Date(selectedPassenger.passportDob).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Not provided'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Issue Date</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {selectedPassenger.passportIssueDate ? new Date(selectedPassenger.passportIssueDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Not provided'}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 border-t border-slate-200/50 dark:border-slate-800 pt-3 mt-1">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <span>{selectedPassenger.documentExpiryDate ? new Date(selectedPassenger.documentExpiryDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Not provided'}</span>
                                            {selectedPassenger.documentExpiryDate && new Date(selectedPassenger.documentExpiryDate) < new Date() && (
                                                <span className="bg-red-100 text-red-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-200/50">Expired</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 italic text-sm">
                                    No passport details registered for this passenger.
                                </div>
                            )}
                        </div>

                        {/* Frequent Flyer Programs Card */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 dark:border-slate-800 pb-3">
                                <Lucide.Plane className="text-ocean-600 shrink-0" size={18} />
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Frequent Flyer Programs</h4>
                            </div>

                            {selectedPassenger.frequentFlyerNumbers && selectedPassenger.frequentFlyerNumbers.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedPassenger.frequentFlyerNumbers.map((ff, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                                            <div className="min-w-0">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Airline</div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{ff.airlineName}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Number</div>
                                                <div className="text-xs font-mono font-bold text-ocean-600 bg-ocean-50/50 px-2.5 py-1 rounded-lg border border-ocean-100/30">
                                                    {ff.frequentFlyerNumber}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 italic text-sm">
                                    No frequent flyer programs registered.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lucide.AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Delete Passenger?</h2>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmation.passenger.fullName}</span>?
                                This action cannot be undone and will remove all their data.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <ActionButton
                                onClick={handleDeletePassenger}
                                variant="danger"
                                className="flex-1 px-6 py-3"
                                loadingMessage="Deleting..."
                                successMessage="Deleted"
                            >
                                Yes, Delete
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Booking Modal */}
            <Modal
                open={isEditBookingModalOpen}
                title="Edit Flight Booking"
                onClose={() => setIsEditBookingModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsEditBookingModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <ActionButton
                            onClick={handleUpdateBooking}
                            loadingMessage="Updating..."
                            successMessage="Updated"
                        >
                            Save Changes
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleUpdateBooking} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Airline</label>
                            <input type="text" required value={editBookingForm.airlineName || ''} onChange={e => setEditBookingForm({ ...editBookingForm, airlineName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Flight Number</label>
                            <input type="text" required value={editBookingForm.flightNumber || ''} onChange={e => setEditBookingForm({ ...editBookingForm, flightNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AirportAutocomplete
                            label="Origin"
                            initialCity={editBookingForm.originCity}
                            initialIata={editBookingForm.originIata}
                            onChange={(val) => setEditBookingForm({ ...editBookingForm, originCity: val, originIata: '' })}
                            onSelect={(airport) => setEditBookingForm({
                                ...editBookingForm,
                                originCity: airport.city,
                                originIata: airport.iata
                            })}
                        />
                        <AirportAutocomplete
                            label="Destination"
                            initialCity={editBookingForm.destCity}
                            initialIata={editBookingForm.destIata}
                            onChange={(val) => setEditBookingForm({ ...editBookingForm, destCity: val, destIata: '' })}
                            onSelect={(airport) => setEditBookingForm({
                                ...editBookingForm,
                                destCity: airport.city,
                                destIata: airport.iata
                            })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Booking Reference (PNR)</label>
                            <input
                                type="text"
                                value={editBookingForm.bookingReference || ''}
                                onChange={e => setEditBookingForm({ ...editBookingForm, bookingReference: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono uppercase"
                                placeholder="e.g. XJ59LZ"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Ticket Number</label>
                            <input
                                type="text"
                                value={editBookingForm.ticketNumber || ''}
                                onChange={e => setEditBookingForm({ ...editBookingForm, ticketNumber: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500 font-mono"
                                placeholder="e.g. 176-238471923"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Departure Date</label>
                            <input type="date" required value={editBookingForm.departureDate || ''} onChange={e => setEditBookingForm({ ...editBookingForm, departureDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Departure Time</label>
                            <input type="time" required value={editBookingForm.departureTime || ''} onChange={e => setEditBookingForm({ ...editBookingForm, departureTime: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                        <select
                            value={editBookingForm.status || 'confirmed'}
                            onChange={e => setEditBookingForm({ ...editBookingForm, status: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500"
                        >
                            <option value="confirmed">Confirmed</option>
                            <option value="updated">Updated</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </form>
            </Modal>

            {/* All Notifications Modal */}
            <Modal
                open={isAllNotificationsModalOpen}
                title="System Notifications Center"
                onClose={() => setIsAllNotificationsModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-between items-center p-4 border-t border-slate-200 bg-slate-50 gap-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ocean-600 hover:bg-ocean-50 rounded-lg transition-all"
                            >
                                <Lucide.CheckCheck size={16} />
                                Mark as Read
                            </button>
                            <button
                                onClick={handleClearAllNotifications}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Lucide.Trash2 size={16} />
                                Clear
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAllNotificationsModalOpen(false)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {notifications.length > 0 ? (
                        notifications.map(note => (
                            <div
                                key={note.id || note._id}
                                className={clsx(
                                    "rounded-2xl p-4 border transition-all",
                                    note.type === 'unrecognized_booking'
                                        ? "bg-amber-50 border-amber-200 text-amber-900"
                                        : "bg-slate-50 border-slate-200 text-slate-900"
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={clsx(
                                        "mt-1 p-2 rounded-xl shadow-sm",
                                        note.type === 'unrecognized_booking' ? "bg-amber-500 text-white" : "bg-ocean-500 text-white"
                                    )}>
                                        {note.type === 'unrecognized_booking' ? <Lucide.UserPlus size={18} /> : <Lucide.Bell size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                                {note.type.replace('_', ' ')}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {!note.read && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(note.id || note._id)}
                                                        className="text-ocean-600 hover:text-ocean-700 p-1 hover:bg-ocean-50 rounded-md transition-all"
                                                        title="Mark as Read"
                                                    >
                                                        <Lucide.CheckCircle2 size={14} />
                                                    </button>
                                                )}
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {new Date(note.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 mb-2">
                                            <p className="text-sm font-semibold leading-relaxed">{note.message}</p>
                                            {note.passengerId && typeof note.passengerId === 'object' && (
                                                <div className="self-start">
                                                    <span className="px-2 py-0.5 bg-ocean-100 dark:bg-ocean-950/50 text-ocean-700 dark:text-ocean-400 text-[9px] font-black uppercase rounded-md border border-ocean-200/50 dark:border-ocean-900/50">
                                                        Passenger: {note.passengerId.fullName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {note.meta && (
                                            <div className="mt-3">
                                                <div className="text-[10px] font-mono bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-black/5 dark:border-white/5 flex flex-wrap gap-2 mb-3">
                                                    {Object.entries(note.meta).map(([k, v]) => {
                                                        if (k === 'wa_link') return null;
                                                        if (k === 'isReturn') return null;
                                                        if (k === 'returnDate' && !v) return null;

                                                        const label = k === 'returnDate' ? 'Return Date' : k;

                                                        if (typeof v === 'object' && v !== null) {
                                                            return Object.entries(v).map(([sk, sv]) => (
                                                                <span key={sk} className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                    <span className="opacity-50 uppercase text-[8px] font-black mr-1">{sk}:</span>
                                                                    <span className="text-slate-900 dark:text-slate-100">{typeof sv === 'object' ? JSON.stringify(sv) : String(sv)}</span>
                                                                </span>
                                                            ));
                                                        }
                                                        return (
                                                            <span key={k} className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <span className="opacity-50 uppercase text-[8px] font-black mr-1">{label}:</span>
                                                                <span className="text-slate-900 dark:text-slate-100">{String(v)}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                {note.type === 'booking_request' && note.meta.phone && (
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={note.meta.wa_link || `https://wa.me/${(note.meta.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello%20This%20is%20a%20representative%20from%20Dnarai%20Enterprise%2C%20we%20got%20your%20request%20and%20we%20will%20get%20back%20to%20you%20shortly%2C`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-green-700 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Lucide.Phone size={12} />
                                                            WhatsApp
                                                        </a>
                                                        <a
                                                            href={`mailto:${note.meta.email}`}
                                                            className="px-3 py-1.5 bg-ocean-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-ocean-700 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Lucide.Mail size={12} />
                                                            Email
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Lucide.BellOff size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                            <p className="text-sm text-slate-500">There are no system notifications at this time.</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Flight Details Modal */}
            <Modal
                open={isBookingDetailsModalOpen}
                title="Detailed Flight Information"
                onClose={() => setIsBookingDetailsModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-between items-center p-4 border-t border-slate-200 gap-4">
                        <button
                            onClick={() => {
                                setIsBookingDetailsModalOpen(false);
                                openEditBookingModal(viewingBooking);
                            }}
                            className="px-6 py-2 bg-ocean-600 text-white rounded-lg text-sm font-bold hover:bg-ocean-700 transition-all flex items-center gap-2"
                        >
                            <Lucide.Edit size={16} />
                            Edit Flight
                        </button>
                        <button
                            onClick={() => setIsBookingDetailsModalOpen(false)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                            Close Details
                        </button>
                    </div>
                }
            >
                {viewingBooking && (
                    <div className="p-0">
                        {/* Header Banner */}
                        <div className="bg-slate-900 text-white p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-ocean-400 mb-1">Flight Status</div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black">{viewingBooking.flightNumber}</h2>
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            viewingBooking.status === 'confirmed' ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                                        )}>
                                            {viewingBooking.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Airline</div>
                                    <div className="text-xl font-bold">{viewingBooking.airlineName}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                                <div className="flex-1">
                                    <div className="text-4xl font-black mb-1">{viewingBooking.origin?.iata}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{viewingBooking.origin?.city}</div>
                                </div>
                                <div className="flex flex-col items-center px-8">
                                    <div className="h-px w-20 bg-gradient-to-r from-transparent via-ocean-500 to-transparent relative">
                                        <Lucide.Plane size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ocean-400" />
                                    </div>
                                </div>
                                <div className="flex-1 text-right">
                                    <div className="text-4xl font-black mb-1">{viewingBooking.destination?.iata}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{viewingBooking.destination?.city}</div>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Lucide.Calendar size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Departure Date</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900">
                                    {new Date(viewingBooking.departureDateTimeUtc).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Lucide.Clock size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Departure Time</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900">
                                    {viewingBooking.departureTime24 ? convertTo12Hour(viewingBooking.departureTime24) : new Date(viewingBooking.departureDateTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 bg-ocean-50 rounded-2xl p-4 border border-ocean-100">
                                <div className="flex items-center gap-2 text-ocean-600 mb-2">
                                    <Lucide.Info size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Service Information</span>
                                </div>
                                <div className="text-sm font-medium text-slate-700 leading-relaxed">
                                    This flight is scheduled for departure from <span className="font-bold text-slate-900">{viewingBooking.origin?.city}</span> to <span className="font-bold text-slate-900">{viewingBooking.destination?.city}</span>.
                                    Confirmation has been sent to the passenger.
                                </div>
                            </div>
                        </div>

                        {/* Passenger Quick Info */}
                        <div className="px-6 pb-6">
                            <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-slate-800 cursor-pointer" onClick={() => {
                                const p = passengers.find(pass => (pass.id || pass._id) === viewingBooking.passengerId);
                                if (p) {
                                    setSelectedPassenger(p);
                                    setIsPassengerDetailsModalOpen(true);
                                    setIsBookingDetailsModalOpen(false);
                                }
                            }}>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-ocean-500 flex items-center justify-center text-white font-black text-xs">
                                        {passengers.find(p => (p.id || p._id) === viewingBooking.passengerId)?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Passenger</div>
                                        <div className="text-sm font-bold text-white">
                                            {passengers.find(p => (p.id || p._id) === viewingBooking.passengerId)?.fullName}
                                        </div>
                                    </div>
                                </div>
                                <Lucide.ArrowRight className="text-slate-600" size={20} />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add Staff Modal */}
            <Modal
                open={isAddStaffModalOpen}
                title="Register New Agency Staff"
                onClose={() => setIsAddStaffModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button
                            onClick={() => setIsAddStaffModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <ActionButton
                            onClick={handleAddStaff}
                            className="bg-ocean-600 hover:bg-ocean-700 shadow-ocean-600/30"
                            loadingMessage="Creating..."
                            successMessage="Staff Added"
                        >
                            Create Account
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleAddStaff} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Login Email</label>
                            <div className="relative">
                                <Lucide.Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={addStaffForm.email}
                                    onChange={e => setAddStaffForm({ ...addStaffForm, email: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all font-medium"
                                    placeholder="staff@dnarai.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Access Role</label>
                            <div className="relative">
                                <Lucide.Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    value={addStaffForm.role}
                                    onChange={e => setAddStaffForm({ ...addStaffForm, role: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all font-bold text-slate-700"
                                >
                                    <option value="staff">Staff (Limited Control)</option>
                                    <option value="agent">Agent (Booking Management)</option>
                                    <option value="admin">Admin (Full Control)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Custom Password (Optional)</label>
                            <div className="relative">
                                <Lucide.Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={addStaffForm.password}
                                    onChange={e => setAddStaffForm({ ...addStaffForm, password: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all font-mono"
                                    placeholder="Leave blank to auto-generate"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Staff Creation Success Feedback */}
            {/* Traveling Today Modal */}
            <Modal
                open={isTravelingTodayModalOpen}
                title={`Traveling Passengers (${travelingPassengers.length})`}
                onClose={() => setIsTravelingTodayModalOpen(false)}
                footer={
                    <div className="flex justify-end p-4 border-t border-slate-200">
                        <button
                            onClick={() => setIsTravelingTodayModalOpen(false)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <div className="p-0">
                    {travelingPassengers.length > 0 ? (
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Passenger</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Flight</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {travelingPassengers.map(p => (
                                        <tr key={p.id || p._id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{p.fullName}</div>
                                                <div className="text-xs text-slate-500">{p.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {p.bookings && p.bookings[0] ? (
                                                    <div>
                                                        <div className="font-bold text-ocean-600">{p.bookings[0].flightNumber}</div>
                                                        <div className="text-xs text-slate-500">{p.bookings[0].origin?.city} → {p.bookings[0].destination?.city}</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">N/A</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setIsTravelingTodayModalOpen(false);
                                                        setSelectedPassenger(p);
                                                        setIsPassengerDetailsModalOpen(true);
                                                    }}
                                                    className="text-xs font-bold text-ocean-600 hover:text-ocean-700"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                            <Lucide.CalendarX size={48} className="text-slate-200 mb-4" />
                            <p className="font-medium">No passengers traveling on this date.</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Active Bookings Modal */}
            <Modal
                open={isActiveBookingsModalOpen}
                title={`Active Bookings (${bookings.filter(b => b.status === 'confirmed' && new Date(b.departureDateTimeUtc) >= new Date()).length})`}
                onClose={() => setIsActiveBookingsModalOpen(false)}
                footer={
                    <div className="flex justify-end p-4 border-t border-slate-200">
                        <button
                            onClick={() => setIsActiveBookingsModalOpen(false)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800"
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {bookings.filter(b => b.status === 'confirmed' && new Date(b.departureDateTimeUtc) >= new Date()).length > 0 ? (
                        <div className="space-y-3">
                            {bookings.filter(b => b.status === 'confirmed' && new Date(b.departureDateTimeUtc) >= new Date()).map(b => (
                                <div
                                    key={b.id || b._id}
                                    onClick={() => {
                                        setIsActiveBookingsModalOpen(false);
                                        handleViewBookingDetails(b);
                                    }}
                                    className="border border-slate-200 rounded-xl p-4 hover:border-ocean-300 hover:shadow-md transition-all cursor-pointer group bg-white"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {(b.airlineName || '??').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{b.airlineName} <span className="text-slate-400 font-normal">({b.flightNumber})</span></div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    {b.origin?.city} ({b.origin?.iata}) → {b.destination?.city} ({b.destination?.iata})
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Lucide.Calendar size={10} />
                                                    {new Date(b.departureDateTimeUtc).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-slate-400 group-hover:text-ocean-600 transition-colors">
                                            <Lucide.ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                            <Lucide.Plane size={48} className="text-slate-200 mb-4 opacity-50" />
                            <p className="font-medium">No Active Booking</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Staff Manager Modal */}
            <Modal
                open={isStaffManagerModalOpen}
                title="Agency Staff & Team Access"
                onClose={() => { setIsStaffManagerModalOpen(false); setStaffActionFeedback(null); }}
                maxWidth="max-w-4xl"
            >
                <div className="p-6 space-y-6">
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Lucide.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by email or role..."
                                value={staffSearchQuery}
                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-ocean-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadStaffMembers}
                                disabled={isLoadingStaff}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                                title="Refresh List"
                            >
                                <Lucide.RefreshCw size={16} className={clsx(isLoadingStaff && "animate-spin")} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsStaffManagerModalOpen(false)
                                    setIsAddStaffModalOpen(true)
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-ocean-600 text-white rounded-xl text-xs font-bold hover:bg-ocean-700 shadow-md transition-all whitespace-nowrap"
                            >
                                <Lucide.UserPlus size={16} />
                                <span>Add New Staff</span>
                            </button>
                        </div>
                    </div>

                    {/* Action Feedback Banner */}
                    {staffActionFeedback && (
                        <div
                            className={clsx(
                                "p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in",
                                staffActionFeedback.type === 'success'
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-rose-50 text-rose-800 border border-rose-200"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {staffActionFeedback.type === 'success' ? (
                                    <Lucide.CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                    <Lucide.AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <span>{staffActionFeedback.message}</span>
                            </div>
                            <button onClick={() => setStaffActionFeedback(null)} className="text-slate-400 hover:text-slate-600">
                                <Lucide.X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Staff List Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {isLoadingStaff && staffMembers.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Lucide.Loader2 size={32} className="animate-spin mx-auto mb-2 text-ocean-600" />
                                <p className="text-xs font-bold">Loading staff members...</p>
                            </div>
                        ) : filteredStaff.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Lucide.Users size={32} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700">No staff members found</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {staffSearchQuery ? 'Try matching another search term' : 'Click "Add New Staff" to provision team accounts.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                                {filteredStaff.map((staff) => {
                                    const isSelf = currentAdminEmail && staff.email?.toLowerCase() === currentAdminEmail.toLowerCase()
                                    const roleColors = {
                                        admin: 'bg-purple-100 text-purple-700 border-purple-200',
                                        agent: 'bg-blue-100 text-blue-700 border-blue-200',
                                        staff: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    }
                                    const initials = staff.email?.slice(0, 2).toUpperCase() || 'ST'

                                    return (
                                        <div key={staff._id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200 shadow-sm">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900 text-sm truncate">{staff.email}</span>
                                                        {isSelf && (
                                                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-bold">
                                                                You
                                                            </span>
                                                        )}
                                                        <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider", roleColors[staff.role] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                                            {staff.role}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                                        <span>Added: {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>Last Active: {staff.lastActivity ? new Date(staff.lastActivity).toLocaleDateString() : 'Never'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                <button
                                                    onClick={() => handleResendStaffCredentials(staff._id, staff.email)}
                                                    disabled={resendingStaffId === staff._id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                    title="Generate new temporary password & send via email"
                                                >
                                                    {resendingStaffId === staff._id ? (
                                                        <>
                                                            <Lucide.Loader2 size={13} className="animate-spin" />
                                                            <span>Sending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lucide.Mail size={13} />
                                                            <span>Resend Password</span>
                                                        </>
                                                    )}
                                                </button>

                                                {!isSelf && (
                                                    <button
                                                        onClick={() => handleDeleteStaff(staff._id, staff.email)}
                                                        disabled={deletingStaffId === staff._id}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                        title="Remove staff member"
                                                    >
                                                        {deletingStaffId === staff._id ? (
                                                            <Lucide.Loader2 size={13} className="animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Lucide.Trash2 size={13} />
                                                                <span>Remove</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {staffCreationSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-green-500/30">
                            <Lucide.CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Staff Registered!</h2>
                        <p className="text-slate-500 mb-4">Account created successfully for <span className="font-bold text-slate-900">{staffCreationSuccess.user.email}</span></p>

                        {staffCreationSuccess.emailSent ? (
                            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                                <Lucide.MailCheck size={16} className="text-emerald-600 shrink-0" />
                                <span>Credentials successfully emailed to staff member!</span>
                            </div>
                        ) : (
                            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center justify-center gap-2">
                                <Lucide.MailWarning size={16} className="text-amber-600 shrink-0" />
                                <span>Email delivery failed ({staffCreationSuccess.emailError || 'check mail server'}). Please provide password directly:</span>
                            </div>
                        )}

                        <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 mb-8 space-y-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Temporary Password</div>
                                <div className="text-3xl font-black text-ocean-600 font-mono tracking-wider select-all">
                                    {staffCreationSuccess.tempPassword}
                                </div>
                            </div>
                            <div className="text-xs font-bold text-slate-400">
                                Staff can log in with their email and this password. They will be asked to change it upon first login.
                            </div>
                        </div>

                        <button
                            onClick={() => setStaffCreationSuccess(null)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                        >
                            Done, Got It
                        </button>
                    </div>
                </div>
            )}

            {/* Create Blog Modal */}
            <Modal
                open={isCreateBlogModalOpen}
                title="Publish Travel Insight"
                onClose={() => setIsCreateBlogModalOpen(false)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button
                            onClick={() => setIsCreateBlogModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <ActionButton
                            onClick={handleCreateBlog}
                            className="bg-ocean-600 hover:bg-ocean-700 shadow-ocean-600/30"
                            loadingMessage="Publishing..."
                            successMessage="Insight Live!"
                        >
                            Publish Broadcast
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleCreateBlog} className="p-6 space-y-6">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Publishing a blog post will automatically notify all registered passengers via in-app alerts and
                        <span className="text-ocean-600 font-bold"> Web Push Notifications</span>.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Headline / Title</label>
                            <input
                                type="text"
                                required
                                value={createBlogForm.title}
                                onChange={e => setCreateBlogForm({ ...createBlogForm, title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all font-bold text-slate-900"
                                placeholder="e.g. New Executive Route: Lagos to London"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Content</label>
                            <textarea
                                required
                                rows={8}
                                value={createBlogForm.content}
                                onChange={e => setCreateBlogForm({ ...createBlogForm, content: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all text-sm font-medium leading-relaxed"
                                placeholder="Write your insight here..."
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Blog Manager Modal */}
            <Modal
                open={isBlogManagerModalOpen}
                title="Manage Travel Insights"
                onClose={() => setIsBlogManagerModalOpen(false)}
            >
                <div className="p-0 max-h-[70vh] overflow-y-auto">
                    {blogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium">No insights published yet.</div>
                    ) : (
                        <div className="flex flex-col h-full justify-between">
                            <div className="divide-y divide-slate-100 flex-1">
                                {paginatedBlogs.map(blog => (
                                    <div key={blog._id} className="p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="h-16 w-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                <img
                                                    src={blog.imageUrl || `https://source.unsplash.com/featured/100x100?airline,airplane,${blog.slug}`}
                                                    className="w-full h-full object-cover"
                                                    alt="Insight Thumbnail"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 truncate">{blog.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">Slug: {blog.slug}</p>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <a
                                                        href={`/blog/${blog.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-black uppercase text-ocean-600 hover:underline"
                                                    >
                                                        View Public Link
                                                    </a>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(blog.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingBlog(blog)}
                                                    className="p-2 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Lucide.Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBlog(blog._id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Lucide.Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalInsightPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-6 pt-4 border-t border-slate-100 bg-slate-50/50">
                                    <div className="text-xs font-semibold text-slate-500">
                                        Showing <span className="font-bold text-slate-900">{(insightPage - 1) * INSIGHTS_PER_PAGE + 1}</span> to{' '}
                                        <span className="font-bold text-slate-900">
                                            {Math.min(insightPage * INSIGHTS_PER_PAGE, blogs.length)}
                                        </span>{' '}
                                        of <span className="font-bold text-slate-900">{blogs.length}</span> insights
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={insightPage === 1}
                                            onClick={() => setInsightPage(prev => Math.max(prev - 1, 1))}
                                            className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                        >
                                            <Lucide.ChevronLeft size={16} />
                                        </button>
                                        
                                        {(() => {
                                            if (totalInsightPages <= 7) {
                                                return Array.from({ length: totalInsightPages }, (_, i) => i + 1);
                                            }
                                            const pages = [];
                                            for (let i = 1; i <= totalInsightPages; i++) {
                                                if (
                                                    i === 1 ||
                                                    i === totalInsightPages ||
                                                    (i >= insightPage - 1 && i <= insightPage + 1)
                                                ) {
                                                    pages.push(i);
                                                } else if (
                                                    pages[pages.length - 1] !== '...'
                                                ) {
                                                    pages.push('...');
                                                }
                                            }
                                            return pages;
                                        })().map((pageNum, idx) => {
                                            if (pageNum === '...') {
                                                return (
                                                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs font-bold">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setInsightPage(pageNum)}
                                                    className={clsx(
                                                        "h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all border",
                                                        insightPage === pageNum
                                                            ? "bg-ocean-600 border-ocean-600 text-white shadow-sm shadow-ocean-600/20"
                                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                        
                                        <button
                                            disabled={insightPage === totalInsightPages}
                                            onClick={() => setInsightPage(prev => Math.min(prev + 1, totalInsightPages))}
                                            className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                        >
                                            <Lucide.ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Edit Blog Modal */}
            <Modal
                open={!!editingBlog}
                title="Edit Travel Insight"
                onClose={() => setEditingBlog(null)}
                footer={
                    <div className="flex flex-wrap justify-end gap-3 p-4 border-t border-slate-200">
                        <button
                            onClick={() => setEditingBlog(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <ActionButton
                            onClick={handleUpdateBlog}
                            className="bg-ocean-600 hover:bg-ocean-700"
                            loadingMessage="Saving..."
                            successMessage="Updated!"
                        >
                            Save Changes
                        </ActionButton>
                    </div>
                }
            >
                <form onSubmit={handleUpdateBlog} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Headline / Title</label>
                            <input
                                type="text"
                                required
                                value={editingBlog?.title || ''}
                                onChange={e => setEditingBlog({ ...editingBlog, title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all font-bold text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Content</label>
                            <textarea
                                required
                                rows={8}
                                value={editingBlog?.content || ''}
                                onChange={e => setEditingBlog({ ...editingBlog, content: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-ocean-500 transition-all text-sm font-medium leading-relaxed"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Edit Blog Modal (Inline) */}
            {editingBlog && (
                <Modal
                    open={!!editingBlog}
                    title="Edit Travel Insight"
                    onClose={() => setEditingBlog(null)}
                    footer={
                        <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                            <button onClick={() => setEditingBlog(null)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                            <ActionButton onClick={handleUpdateBlog} successMessage="Updated">Save Changes</ActionButton>
                        </div>
                    }
                >
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Title</label>
                            <input type="text" value={editingBlog.title} onChange={e => setEditingBlog({ ...editingBlog, title: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Content</label>
                            <textarea rows={10} value={editingBlog.content} onChange={e => setEditingBlog({ ...editingBlog, content: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create Invoice Modal */}
            <Modal
                open={isCreateInvoiceModalOpen}
                title="Create New Invoice"
                onClose={() => setIsCreateInvoiceModalOpen(false)}
                footer={
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsCreateInvoiceModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                        <ActionButton onClick={handleCreateInvoice} successMessage="Invoice Created">Create Invoice</ActionButton>
                    </div>
                }
            >
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Number</label>
                            <input type="text" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <input type="date" value={invoiceForm.date} onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bill To (Name)</label>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={invoiceForm.passengerName}
                                onChange={e => setInvoiceForm({ ...invoiceForm, passengerName: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={invoiceForm.passengerEmail}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, passengerEmail: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="+234..."
                                    value={invoiceForm.passengerPhone}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, passengerPhone: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Line Items & Services</h3>
                            <button onClick={addInvoiceItem} className="px-3 py-1 bg-ocean-50 text-ocean-600 rounded-lg text-xs font-bold hover:bg-ocean-100 flex items-center gap-1 transition-all">
                                <Lucide.Plus size={14} /> Add Service
                            </button>
                        </div>
                        {invoiceForm.items.map((item, idx) => (
                            <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative group">
                                <div className="flex justify-between items-center">
                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase">Item {idx + 1}</span>
                                    {invoiceForm.items.length > 1 && (
                                        <button
                                            onClick={() => removeInvoiceItem(idx)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove Item"
                                        >
                                            <Lucide.Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Service Description</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Flight Ticketing, Visa Processing..."
                                            value={item.description}
                                            onChange={e => handleInvoiceItemChange(idx, 'description', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-ocean-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Detailed Information (Optional)</label>
                                            <span className="text-[10px] text-slate-400 font-medium">Press Enter for new line</span>
                                        </div>
                                        <textarea
                                            placeholder="e.g.&#10;Going: Lagos (LOS) to London (LHR) - 12th May&#10;Return: London (LHR) to Lagos (LOS) - 26th May"
                                            value={item.subText}
                                            rows={3}
                                            onChange={e => handleInvoiceItemChange(idx, 'subText', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-ocean-500 outline-none transition-all resize-y leading-relaxed"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Rate</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{invoiceForm.currency}</span>
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={e => handleInvoiceItemChange(idx, 'rate', Number(e.target.value))}
                                                    className="w-full pl-7 pr-2.5 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:border-ocean-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Qty</label>
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={e => handleInvoiceItemChange(idx, 'qty', Number(e.target.value))}
                                                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:border-ocean-500 outline-none transition-all text-center"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                                            <div className="w-full px-3 py-2 sm:py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-slate-900 flex items-center justify-between sm:justify-start">
                                                <span className="text-[10px] text-slate-400 font-semibold sm:hidden">Item Subtotal:</span>
                                                <span>{invoiceForm.currency}{item.amount?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Invoice Status</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const total = (invoiceForm.subTotal || 0) + (invoiceForm.serviceCharge || 0) - (invoiceForm.discount || 0);
                                            setInvoiceForm({ ...invoiceForm, isPaid: false, balanceDue: total });
                                        }}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            !invoiceForm.isPaid ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        Unpaid
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceForm({ ...invoiceForm, isPaid: true, balanceDue: 0 })}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            invoiceForm.isPaid ? "bg-ocean-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        Paid
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Currency Settings</label>
                                <select value={invoiceForm.currency} onChange={e => setInvoiceForm({ ...invoiceForm, currency: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-ocean-500 outline-none">
                                    <option value="₦">Naira (₦)</option>
                                    <option value="$">US Dollar ($)</option>
                                    <option value="£">British Pound (£)</option>
                                    <option value="€">Euro (€)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Payment Method</label>
                                <select value={invoiceForm.paymentType} onChange={e => setInvoiceForm({ ...invoiceForm, paymentType: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-ocean-500 outline-none">
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash Payment</option>
                                    <option value="pos">POS Terminal</option>
                                    <option value="online">Online Payment</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3 bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Sub Total</span>
                                <span>{invoiceForm.currency}{invoiceForm.subTotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Service Charge</span>
                                <div className="flex items-center gap-1 border-b border-slate-700 pb-1">
                                    <span className="text-slate-500">{invoiceForm.currency}</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-transparent focus:outline-none text-white font-black"
                                        value={invoiceForm.serviceCharge}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            const total = (invoiceForm.subTotal || 0) + val - (invoiceForm.discount || 0);
                                            setInvoiceForm({ ...invoiceForm, serviceCharge: val, total, balanceDue: invoiceForm.isPaid ? 0 : total });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Discount</span>
                                <div className="flex items-center gap-1 border-b border-slate-700 pb-1">
                                    <span className="text-slate-500">{invoiceForm.currency}</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-transparent focus:outline-none text-red-400 font-black"
                                        value={invoiceForm.discount}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            const total = (invoiceForm.subTotal || 0) + (invoiceForm.serviceCharge || 0) - val;
                                            setInvoiceForm({ ...invoiceForm, discount: val, total, balanceDue: invoiceForm.isPaid ? 0 : total });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-ocean-400 uppercase tracking-[0.2em]">Balance Due</span>
                                    <span className="text-2xl font-black">{invoiceForm.currency}{invoiceForm.balanceDue?.toLocaleString()}</span>
                                </div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right italic">
                                    Final Amount Payable
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Invoice Modal */}
            <Modal
                open={isEditInvoiceModalOpen}
                title={`Edit Invoice #${editInvoiceForm.invoiceNumber}`}
                onClose={() => setIsEditInvoiceModalOpen(false)}
                footer={
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsEditInvoiceModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                        <ActionButton onClick={handleUpdateInvoice} successMessage="Invoice Updated">Save Changes</ActionButton>
                    </div>
                }
            >
                <div className="p-6 space-y-6">
                    {/* Status & Payment Quick Controls */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</div>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">
                                Current: {editInvoiceForm.isPaid ? (
                                    <span className="text-emerald-600 font-black">PAID IN FULL</span>
                                ) : (
                                    <span className="text-amber-600 font-black">UNPAID / OUTSTANDING</span>
                                )}
                            </div>
                        </div>
                        <div className="flex bg-slate-200/80 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    const total = (editInvoiceForm.subTotal || 0) + (editInvoiceForm.serviceCharge || 0) - (editInvoiceForm.discount || 0);
                                    setEditInvoiceForm({ ...editInvoiceForm, isPaid: false, balanceDue: total });
                                }}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    !editInvoiceForm.isPaid ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Unpaid
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditInvoiceForm({ ...editInvoiceForm, isPaid: true, balanceDue: 0 })}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    editInvoiceForm.isPaid ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Paid
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Number</label>
                            <input
                                type="text"
                                value={editInvoiceForm.invoiceNumber}
                                onChange={e => setEditInvoiceForm({ ...editInvoiceForm, invoiceNumber: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <input
                                type="date"
                                value={editInvoiceForm.date}
                                onChange={e => setEditInvoiceForm({ ...editInvoiceForm, date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bill To (Name)</label>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={editInvoiceForm.passengerName}
                                onChange={e => setEditInvoiceForm({ ...editInvoiceForm, passengerName: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={editInvoiceForm.passengerEmail}
                                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, passengerEmail: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="+234..."
                                    value={editInvoiceForm.passengerPhone}
                                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, passengerPhone: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Line Items &amp; Services</h3>
                            <button onClick={addEditInvoiceItem} className="px-3 py-1 bg-ocean-50 text-ocean-600 rounded-lg text-xs font-bold hover:bg-ocean-100 flex items-center gap-1 transition-all">
                                <Lucide.Plus size={14} /> Add Service
                            </button>
                        </div>
                        {editInvoiceForm.items.map((item, idx) => (
                            <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative group">
                                <div className="flex justify-between items-center">
                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase">Item {idx + 1}</span>
                                    {editInvoiceForm.items.length > 1 && (
                                        <button
                                            onClick={() => removeEditInvoiceItem(idx)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove Item"
                                        >
                                            <Lucide.Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Service Description</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Flight Ticketing, Visa Processing..."
                                            value={item.description}
                                            onChange={e => handleEditInvoiceItemChange(idx, 'description', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-ocean-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Detailed Information (Optional)</label>
                                            <span className="text-[10px] text-slate-400 font-medium">Press Enter for new line</span>
                                        </div>
                                        <textarea
                                            placeholder="e.g.&#10;Going: Lagos (LOS) to London (LHR) - 12th May&#10;Return: London (LHR) to Lagos (LOS) - 26th May"
                                            value={item.subText}
                                            rows={3}
                                            onChange={e => handleEditInvoiceItemChange(idx, 'subText', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-ocean-500 outline-none transition-all resize-y leading-relaxed"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Rate</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{editInvoiceForm.currency}</span>
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={e => handleEditInvoiceItemChange(idx, 'rate', Number(e.target.value))}
                                                    className="w-full pl-7 pr-2.5 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:border-ocean-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Qty</label>
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={e => handleEditInvoiceItemChange(idx, 'qty', Number(e.target.value))}
                                                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:border-ocean-500 outline-none transition-all text-center"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                                            <div className="w-full px-3 py-2 sm:py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-slate-900 flex items-center justify-between sm:justify-start">
                                                <span className="text-[10px] text-slate-400 font-semibold sm:hidden">Item Subtotal:</span>
                                                <span>{editInvoiceForm.currency}{item.amount?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Currency Settings</label>
                                <select
                                    value={editInvoiceForm.currency}
                                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, currency: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-ocean-500 outline-none"
                                >
                                    <option value="₦">Naira (₦)</option>
                                    <option value="$">US Dollar ($)</option>
                                    <option value="£">British Pound (£)</option>
                                    <option value="€">Euro (€)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Payment Method</label>
                                <select
                                    value={editInvoiceForm.paymentType}
                                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, paymentType: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-ocean-500 outline-none"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash Payment</option>
                                    <option value="pos">POS Terminal</option>
                                    <option value="online">Online Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Notes</label>
                                <textarea
                                    rows={2}
                                    value={editInvoiceForm.notes}
                                    onChange={e => setEditInvoiceForm({ ...editInvoiceForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-ocean-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-3 bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Sub Total (Net Billed)</span>
                                <span>{editInvoiceForm.currency}{editInvoiceForm.subTotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Service Charge (Profit)</span>
                                <div className="flex items-center gap-1 border-b border-slate-700 pb-1">
                                    <span className="text-slate-500">{editInvoiceForm.currency}</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-transparent focus:outline-none text-amber-400 font-black"
                                        value={editInvoiceForm.serviceCharge}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            const total = (editInvoiceForm.subTotal || 0) + val - (editInvoiceForm.discount || 0);
                                            setEditInvoiceForm({
                                                ...editInvoiceForm,
                                                serviceCharge: val,
                                                total,
                                                balanceDue: editInvoiceForm.isPaid ? 0 : total
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Discount</span>
                                <div className="flex items-center gap-1 border-b border-slate-700 pb-1">
                                    <span className="text-slate-500">{editInvoiceForm.currency}</span>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-transparent focus:outline-none text-red-400 font-black"
                                        value={editInvoiceForm.discount}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            const total = (editInvoiceForm.subTotal || 0) + (editInvoiceForm.serviceCharge || 0) - val;
                                            setEditInvoiceForm({
                                                ...editInvoiceForm,
                                                discount: val,
                                                total,
                                                balanceDue: editInvoiceForm.isPaid ? 0 : total
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-white/10">
                                <span>Total Invoiced</span>
                                <span>{editInvoiceForm.currency}{editInvoiceForm.total?.toLocaleString()}</span>
                            </div>
                            <div className="pt-3 mt-1 border-t border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-ocean-400 uppercase tracking-[0.2em]">Balance Due</span>
                                    <span className="text-2xl font-black">{editInvoiceForm.currency}{editInvoiceForm.balanceDue?.toLocaleString()}</span>
                                </div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right italic">
                                    {editInvoiceForm.isPaid ? 'Settled in Full' : 'Amount Outstanding'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Share Invoice Modal */}
            <Modal
                open={isShareInvoiceModalOpen}
                title="Share Invoice"
                onClose={() => setIsShareInvoiceModalOpen(false)}
            >
                <div className="p-6 space-y-6">
                    {/* Quick Send Section */}
                    {selectedInvoiceForShare && (selectedInvoiceForShare.passengerEmail || selectedInvoiceForShare.passengerPhone) && (
                        <div className="bg-ocean-50 border border-ocean-100 rounded-2xl p-6">
                            <h3 className="text-[10px] font-black text-ocean-600 uppercase tracking-[0.2em] mb-4">Saved Contact Details</h3>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-bold text-slate-900">{selectedInvoiceForShare.passengerName}</div>
                                    <div className="text-xs text-slate-500">{selectedInvoiceForShare.passengerEmail || 'No email saved'}</div>
                                    <div className="text-xs text-slate-500">{selectedInvoiceForShare.passengerPhone || 'No phone saved'}</div>
                                </div>
                                <button
                                    onClick={() => handleShareWithPassenger(null)}
                                    className="px-6 py-2.5 bg-ocean-600 text-white rounded-xl text-sm font-black hover:bg-ocean-700 transition-all flex items-center gap-2 shadow-lg shadow-ocean-600/20"
                                >
                                    <Lucide.Send size={16} /> Send Now
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-center gap-4">
                        <div className="h-px bg-slate-100 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Search Passenger List</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <div className="relative">
                        <Lucide.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search passengers..."
                            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl"
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredPassengers.map(p => (
                            <div
                                key={p.id || p._id}
                                className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-white hover:border-ocean-300 hover:shadow-xl hover:shadow-ocean-600/5 transition-all cursor-pointer group"
                                onClick={() => handleShareWithPassenger(p)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-ocean-200 group-hover:text-ocean-700">
                                        {p.fullName[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{p.fullName}</div>
                                        <div className="text-xs text-slate-500">{p.email}</div>
                                    </div>
                                </div>
                                <Lucide.Send className="text-slate-300 group-hover:text-ocean-600" size={18} />
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Hidden component for PDF generation */}
            {selectedInvoiceForShare && (
                <div id="invoice-pdf-template" className="fixed -left-[9999px] top-0 w-[800px] bg-white p-12 font-sans text-slate-800 leading-relaxed">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-6">
                            <img
                                src={`/D-NARAI_Logo-04.png?t=${Date.now()}`}
                                alt="Logo"
                                className="h-20 object-contain"
                                crossOrigin="anonymous"
                            />
                            <div className="border-l-2 border-ocean-100 pl-6 py-1">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">D.NARAI ENTERPRISE</h1>
                                <div className="text-sm font-medium text-slate-500 mt-1 space-y-0.5">
                                    <p className="flex items-center gap-2">
                                        <span className="text-ocean-600 font-bold">P:</span> +234 913 131 5886 / +234 816 669 8589
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="text-ocean-600 font-bold">E:</span> D.naraienterprise.com
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 min-w-[240px]">
                                <h2 className="text-xs font-black text-ocean-600 uppercase tracking-[0.2em] mb-4">Invoice Info</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline gap-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice #</span>
                                        <span className="text-sm font-black text-slate-900">{selectedInvoiceForShare.invoiceNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline gap-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Date</span>
                                        <span className="text-sm font-black text-slate-900">{new Date(selectedInvoiceForShare.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline gap-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Due</span>
                                        <span className="text-sm font-black text-slate-900">On Receipt</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 mt-1 flex justify-between items-baseline gap-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</span>
                                        <span className="text-lg font-black text-ocean-600">{selectedInvoiceForShare.currency}{selectedInvoiceForShare.balanceDue?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing Section */}
                    <div className="mb-12 py-8 border-y border-slate-100 flex justify-between items-start">
                        <div>
                            <h3 className="text-[10px] font-black text-ocean-600 uppercase tracking-[0.2em] mb-3">Bill To</h3>
                            <p className="text-xl font-black text-slate-900">{selectedInvoiceForShare.passengerName}</p>
                            <p className="text-sm text-slate-500 mt-1">Valued Travel Partner</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-[10px] font-black text-ocean-600 uppercase tracking-[0.2em] mb-3">Status</h3>
                            <span className={clsx(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                selectedInvoiceForShare.isPaid || selectedInvoiceForShare.balanceDue === 0
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : "bg-ocean-50 text-ocean-700 border-ocean-100"
                            )}>
                                {selectedInvoiceForShare.isPaid || selectedInvoiceForShare.balanceDue === 0 ? 'Fully Paid' : 'Unpaid / Due'}
                            </span>
                        </div>
                    </div>

                    {/* Invoice Table */}
                    <div className="mb-12">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="pb-4 text-left text-[11px] font-black text-slate-900 uppercase tracking-widest">Description</th>
                                    <th className="pb-4 text-right text-[11px] font-black text-slate-900 uppercase tracking-widest w-24">Rate</th>
                                    <th className="pb-4 text-right text-[11px] font-black text-slate-900 uppercase tracking-widest w-16">Qty</th>
                                    <th className="pb-4 text-right text-[11px] font-black text-slate-900 uppercase tracking-widest w-32">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedInvoiceForShare.items.map((item, idx) => (
                                    <tr key={idx} className="group">
                                        <td className="py-6 pr-8 align-top">
                                            <div className="font-bold text-slate-900 text-sm mb-1 whitespace-pre-line leading-relaxed">
                                                {item.description ? item.description.split('\n').map((line, lIdx) => (
                                                    <span key={lIdx} className="block">{line || '\u00A0'}</span>
                                                )) : null}
                                            </div>
                                            {item.subText && (
                                                <div className="text-xs text-slate-500 leading-relaxed max-w-md whitespace-pre-line mt-1">
                                                    {item.subText.split('\n').map((line, lIdx) => (
                                                        <span key={lIdx} className="block">{line || '\u00A0'}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-6 text-right text-sm font-medium text-slate-600 align-top">{selectedInvoiceForShare.currency}{item.rate?.toLocaleString()}</td>
                                        <td className="py-6 text-right text-sm font-medium text-slate-600 align-top">{item.qty}</td>
                                        <td className="py-6 text-right text-sm font-black text-slate-900 align-top">{selectedInvoiceForShare.currency}{item.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-between items-start mb-16">
                        <div className="max-w-[300px]">
                            {!(selectedInvoiceForShare.isPaid || selectedInvoiceForShare.balanceDue === 0) && (
                                <>
                                    <h3 className="text-[10px] font-black text-ocean-600 uppercase tracking-[0.2em] mb-3">Payment Instructions</h3>
                                    <div className="text-[10px] leading-relaxed text-slate-500 space-y-2">
                                        <p>
                                            Please ensure payment is made to the designated bank account below.
                                            Mention the invoice number <span className="font-bold text-slate-900">#{selectedInvoiceForShare.invoiceNumber}</span> as reference.
                                        </p>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1 font-semibold text-slate-800">
                                            <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Bank:</span> GTBank</p>
                                            <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Account:</span> D.Narai Enterprise LTD</p>
                                            <p><span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] mr-1">Number:</span> 0706119674</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="w-72 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Subtotal</span>
                                <span className="font-black text-slate-900">{selectedInvoiceForShare.currency}{selectedInvoiceForShare.subTotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Service Charge</span>
                                <span className="font-black text-slate-900">{selectedInvoiceForShare.currency}{selectedInvoiceForShare.serviceCharge?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Discount</span>
                                <span className="font-black text-red-600">-{selectedInvoiceForShare.currency}{selectedInvoiceForShare.discount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Total Amount</span>
                                <span className="font-black text-slate-900">{selectedInvoiceForShare.currency}{selectedInvoiceForShare.total?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                                <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Balance Due</span>
                                <span className="text-3xl font-black text-slate-900">{selectedInvoiceForShare.currency}{selectedInvoiceForShare.balanceDue?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Payment Method</span>
                                <span className="text-[10px] font-black text-ocean-600 uppercase tracking-widest">{selectedInvoiceForShare.paymentType?.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mb-16">
                        <div className="text-right">
                            <div className="mb-1">
                                <span className="text-3xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                                    Dnarai
                                </span>
                            </div>
                            <div className="w-64 border-b-2 border-slate-900 mb-2"></div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Date Signed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-10 border-t border-slate-100 text-center">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            &quot;Our Service End when you successfully arrive at your destination.&quot;
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
