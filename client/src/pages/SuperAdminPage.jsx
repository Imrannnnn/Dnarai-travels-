import { useState, useEffect, useMemo, useRef } from 'react'
import * as Lucide from 'lucide-react'
import { getApiBaseUrl } from '../data/api'
import Modal from '../components/Modal'
import clsx from 'clsx'
import { convertTo12Hour } from '../utils/time'
import { useAppData } from '../data/AppDataContext'
import ActionButton from '../components/ActionButton'
import airportData from '../../airports.json'

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

export default function SuperAdminPage() {
    const [token, setToken] = useState(localStorage.getItem('admin_token') || null)
    const [role, setRole] = useState(localStorage.getItem('admin_role') || null)
    const [activeView, setActiveView] = useState('all') // 'all' or 'today'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const { documents, triggerOverlay } = useAppData()

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

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isCreatePassengerModalOpen, setIsCreatePassengerModalOpen] = useState(false)
    const [isCreateBookingModalOpen, setIsCreateBookingModalOpen] = useState(false)
    const [onboardingSuccess, setOnboardingSuccess] = useState(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState(null) // { passenger: {...} }
    const [isEditBookingModalOpen, setIsEditBookingModalOpen] = useState(false)
    const [isAllNotificationsModalOpen, setIsAllNotificationsModalOpen] = useState(false)
    const [bookingFilter, setBookingFilter] = useState('recent') // 'recent' or 'all'
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
    const [addStaffForm, setAddStaffForm] = useState({ email: '', role: 'staff', password: '' })
    const [staffCreationSuccess, setStaffCreationSuccess] = useState(null)

    // New Modals State
    const [isTravelingTodayModalOpen, setIsTravelingTodayModalOpen] = useState(false)
    const [isActiveBookingsModalOpen, setIsActiveBookingsModalOpen] = useState(false)

    const [editForm, setEditForm] = useState({})
    const [createPassengerForm, setCreatePassengerForm] = useState({ fullName: '', email: '', phone: '' })
    const [createBookingForm, setCreateBookingForm] = useState({
        airlineName: '', flightNumber: '', originCity: '', originIata: '',
        destCity: '', destIata: '', departureDate: '', departureTime: '',
        bookingReference: '', ticketNumber: ''
    })
    const [editBookingForm, setEditBookingForm] = useState({})
    const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] = useState(false)
    const [viewingBooking, setViewingBooking] = useState(null)

    // Refs for scrolling
    const passengerListRef = useRef(null)
    const bookingsListRef = useRef(null)

    const baseUrl = getApiBaseUrl()

    useEffect(() => {
        async function fetchAllData() {
            setLoading(true)
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [resP, resB, resN] = await Promise.all([
                    fetch(`${baseUrl}/api/passengers`, { headers }),
                    fetch(`${baseUrl}/api/bookings`, { headers }),
                    fetch(`${baseUrl}/api/notifications`, { headers })
                ])

                if (resP.status === 401 || resB.status === 401 || resN.status === 401) {
                    handleLogout()
                    return
                }

                const [dataP, dataB, dataN] = await Promise.all([resP.json(), resB.json(), resN.json()])
                setPassengers(Array.isArray(dataP) ? dataP : [])
                setBookings(Array.isArray(dataB) ? dataB : [])
                setNotifications(Array.isArray(dataN) ? dataN : [])
            } catch (err) {
                console.error('Failed to fetch admin data', err)
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchAllData()
    }, [token, baseUrl]) // handleLogout is stable, but adding it won't hurt if we want to be strict. 
    // Wait, handleLogout is defined in the same scope. It should be in deps too if we are strict.


    async function handleLogin(e) {
        e.preventDefault()
        setLoginError('')
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
            setToken(data.accessToken)
            setRole(data.role)
        } catch (err) {
            setLoginError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleLogout() {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_role')
        setToken(null)
        setRole(null)
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
        })
    }

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

    const stats = useMemo(() => ({
        totalPassengers: passengers.length,
        activeBookings: bookings.filter(b => b.status === 'confirmed').length,
        pendingNotifications: notifications.filter(n => !n.read).length,
        travelingToday: travelingPassengers.length
    }), [passengers, bookings, notifications, travelingPassengers])

    function scrollToPassengerList() {
        passengerListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }





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
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    // MAIN DASHBOARD
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-ocean-600 rounded-xl flex items-center justify-center text-white shadow-md">
                                    <Lucide.ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Dnarai Enterprise</h1>
                                    <p className="text-xs text-slate-500 font-medium">Agency Dashboard</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="relative" onClick={() => setIsAllNotificationsModalOpen(true)}>
                                <Lucide.Bell className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" size={20} />
                                {stats.pendingNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center cursor-pointer ring-2 ring-white">
                                        {stats.pendingNotifications}
                                    </span>
                                )}
                            </div>

                            {role === 'admin' && (
                                <button
                                    onClick={() => setIsAddStaffModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                >
                                    <Lucide.UserPlus size={16} />
                                    Add Staff
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <Lucide.LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-4 md:mt-0">
                    {[
                        { label: 'Passengers', labelFull: 'Total Passengers', value: stats.totalPassengers, icon: Lucide.Users, color: 'bg-ocean-500', bgLight: 'bg-ocean-50', onClick: () => { setActiveView('all'); scrollToPassengerList(); } },
                        { label: 'Bookings', labelFull: 'Active Bookings', value: stats.activeBookings, icon: Lucide.PlaneTakeoff, color: 'bg-green-500', bgLight: 'bg-green-50', onClick: () => setIsActiveBookingsModalOpen(true) },
                        { label: 'Today', labelFull: 'Traveling Today', value: stats.travelingToday, icon: Lucide.CalendarCheck, color: 'bg-purple-500', bgLight: 'bg-purple-50', onClick: () => setIsTravelingTodayModalOpen(true) },
                        { label: 'Alerts', labelFull: 'Notifications', value: stats.pendingNotifications, icon: Lucide.Bell, color: 'bg-amber-500', bgLight: 'bg-amber-50', onClick: () => setIsAllNotificationsModalOpen(true) },
                    ].map(stat => (
                        <div
                            key={stat.labelFull}
                            onClick={stat.onClick}
                            className={clsx(
                                "bg-white rounded-[1.5rem] md:rounded-2xl p-4 md:p-6 border border-slate-200 hover:shadow-lg transition-all active:scale-95 group",
                                stat.onClick && "cursor-pointer"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                                <div className={`${stat.bgLight} p-2 md:p-3 rounded-xl transition-colors group-hover:scale-110 duration-300`}>
                                    <stat.icon className={`${stat.color.replace('bg-', 'text-')}`} size={20} />
                                </div>
                                {stat.value > 0 && stat.label === 'Alerts' && (
                                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                )}
                            </div>
                            <div className="text-xl md:text-3xl font-black text-slate-900 mb-0.5 md:mb-1">{stat.value}</div>
                            <div className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-tight md:normal-case md:tracking-normal">
                                <span className="hidden md:inline">{stat.labelFull}</span>
                                <span className="md:hidden">{stat.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Grid Layout */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Passengers List */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Passengers Section */}
                        <div ref={passengerListRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                                {activeView === 'today' ? 'Traveling Today' : 'Passenger Registry'}
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {activeView === 'today'
                                                    ? `${filteredPassengers.length} passengers traveling on ${new Date(selectedDate).toLocaleDateString()}`
                                                    : 'Manage all registered passengers'
                                                }
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsCreatePassengerModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-ocean-600 text-white rounded-xl text-sm font-bold hover:bg-ocean-700 transition-all shadow-md whitespace-nowrap"
                                        >
                                            <Lucide.Plus size={18} />
                                            New Passenger
                                        </button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                                            <button
                                                onClick={() => setActiveView('all')}
                                                className={clsx(
                                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                                    activeView === 'all'
                                                        ? "bg-white dark:bg-slate-900 text-ocean-600 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                Registry
                                            </button>
                                            <button
                                                onClick={() => setActiveView('today')}
                                                className={clsx(
                                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                                    activeView === 'today'
                                                        ? "bg-white dark:bg-slate-900 text-ocean-600 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                Traveling Today
                                            </button>
                                        </div>

                                        {activeView === 'today' && (
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                                <Lucide.Calendar size={16} className="text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={selectedDate}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                    className="text-sm font-medium focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Search */}
                                    <div className="relative">
                                        <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search passengers..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-ocean-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">Pending Document Reviews</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.filter(d => d.status === 'Pending').length > 0 ? (
                                        documents.filter(d => d.status === 'Pending').map((doc, idx) => (
                                            <div key={idx} className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Lucide.FileText size={16} className="text-yellow-600" />
                                                        <span className="font-bold text-slate-900 text-sm">{doc.title}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">Exp: {doc.expiry}</div>
                                                </div>
                                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Review</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-sm text-slate-500 italic">
                                            No documents pending review
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="block md:hidden">
                                {filteredPassengers.map(p => (
                                    <div
                                        key={p.id || p._id}
                                        onClick={() => setSelectedPassenger(p)}
                                        className={clsx(
                                            "p-5 border-b border-slate-100 flex items-center justify-between transition-colors",
                                            (selectedPassenger?.id === p.id || selectedPassenger?._id === p._id) ? "bg-ocean-50" : "bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-black text-lg shadow-sm border border-white">
                                                {p.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-base leading-tight">{p.fullName}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {(p.id || p._id)?.slice(-8).toUpperCase()}</div>
                                            </div>
                                        </div>
                                        <Lucide.ChevronRight size={20} className="text-slate-300" />
                                    </div>
                                ))}
                                {filteredPassengers.length === 0 && (
                                    <div className="p-10 text-center text-slate-400 italic">No passengers found</div>
                                )}
                            </div>

                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Passenger</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Contact</th>
                                            {activeView === 'today' && (
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Flight</th>
                                            )}
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPassengers.map(p => (
                                            <tr
                                                key={p.id || p._id}
                                                onClick={() => setSelectedPassenger(p)}
                                                className={clsx(
                                                    "hover:bg-slate-50 cursor-pointer transition-colors",
                                                    (selectedPassenger?.id === p.id || selectedPassenger?._id === p._id) && "bg-ocean-50"
                                                )}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-bold text-sm">
                                                            {p.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{p.fullName}</div>
                                                            <div className="text-xs text-slate-500">ID: {(p.id || p._id)?.slice(-8).toUpperCase()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-900">{p.email}</div>
                                                    <div className="text-xs text-slate-500">{p.phone || 'No phone'}</div>
                                                </td>
                                                {activeView === 'today' && (
                                                    <td className="px-6 py-4">
                                                        {p.bookings && p.bookings.length > 0 ? (
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); handleViewBookingDetails(p.bookings[0]); }}
                                                                className="text-sm hover:bg-ocean-100 p-2 rounded-lg transition-all border border-transparent hover:border-ocean-200"
                                                            >
                                                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                                                    {p.bookings[0].flightNumber}
                                                                    <Lucide.ExternalLink size={12} className="text-slate-400" />
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {p.bookings[0].origin?.iata} → {p.bookings[0].destination?.iata}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No flight</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditForm(p); setIsEditModalOpen(true); }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ocean-600 hover:bg-ocean-50 rounded-lg transition-all"
                                                        >
                                                            <Lucide.Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ passenger: p }); }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Lucide.Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Bookings */}
                        <div ref={bookingsListRef} className="bg-white rounded-2xl border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    {bookingFilter === 'recent' ? 'Recent Bookings' : 'All Bookings'}
                                </h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        onClick={() => setBookingFilter('recent')}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            bookingFilter === 'recent'
                                                ? "bg-white dark:bg-slate-900 text-ocean-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Recent
                                    </button>
                                    <button
                                        onClick={() => setBookingFilter('all')}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            bookingFilter === 'all'
                                                ? "bg-white dark:bg-slate-900 text-ocean-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {(bookingFilter === 'recent' ? bookings.slice(0, 6) : bookings).map(b => (
                                    <div
                                        key={b._id}
                                        onClick={() => handleViewBookingDetails(b)}
                                        className="border border-slate-200 rounded-xl p-4 hover:border-ocean-300 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                                    {b.airlineName?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{b.airlineName}</div>
                                                    <div className="text-xs text-ocean-600 font-medium">{b.flightNumber}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-full text-xs font-bold",
                                                    b.status === 'confirmed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {b.status}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditBookingModal(b);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-all"
                                                >
                                                    <Lucide.Edit size={14} />
                                                </button>
                                                <Lucide.ArrowRight size={16} className="text-slate-400 group-hover:text-ocean-600 transition-colors" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900">{b.origin?.iata}</span>
                                                <Lucide.ArrowRight size={16} className="text-slate-400" />
                                                <span className="font-bold text-slate-900">{b.destination?.iata}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(b.departureDateTimeUtc).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Selected Passenger & Notifications */}
                    <div className="space-y-6">
                        {/* Selected Passenger Details */}
                        <div className="bg-white rounded-2xl border-2 border-slate-900 p-6">
                            {selectedPassenger ? (
                                <div className="space-y-6">
                                    <div className="text-center pb-6 border-b border-slate-200">
                                        <div className="h-20 w-20 rounded-full bg-ocean-600 text-white flex items-center justify-center text-2xl font-black mx-auto mb-4">
                                            {selectedPassenger.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900">{selectedPassenger.fullName}</h3>
                                        <p className="text-sm text-slate-500 mt-1">Verified Passenger</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Email</div>
                                            <div className="text-sm font-medium text-slate-900">{selectedPassenger.email}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center group">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Phone</div>
                                                <div className="text-sm font-medium text-slate-900">{selectedPassenger.phone || 'Not provided'}</div>
                                            </div>
                                            {selectedPassenger.phone && (
                                                <a
                                                    href={`https://wa.me/${(selectedPassenger.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello%20This%20is%20a%20representative%20from%20Dnarai%20Enterprise%2C%20we%20got%20your%20request`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-green-100 text-green-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-green-200"
                                                >
                                                    <Lucide.Phone size={16} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Document</div>
                                            <div className="text-sm font-medium text-slate-900">
                                                {selectedPassenger.documentNumberMasked || 'Not provided'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button
                                            onClick={() => setIsCreateBookingModalOpen(true)}
                                            className="px-4 py-3 bg-ocean-600 text-white rounded-xl text-sm font-bold hover:bg-ocean-700 transition-all"
                                        >
                                            Add Flight
                                        </button>
                                        <button
                                            onClick={() => { setEditForm(selectedPassenger); setIsEditModalOpen(true); }}
                                            className="px-4 py-3 bg-slate-100 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                        >
                                            Edit Info
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setDeleteConfirmation({ passenger: selectedPassenger })}
                                        className="w-full mt-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Lucide.Trash2 size={16} />
                                        Delete Passenger
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Lucide.UserCircle size={48} className="text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm font-medium text-slate-500">Select a passenger to view details</p>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black uppercase tracking-tight">System Alerts</h3>
                                {notifications.length > 0 && (
                                    <ActionButton
                                        onClick={handleClearAllNotifications}
                                        variant="ghost"
                                        className="text-[10px] !py-1 !px-2 tracking-widest text-slate-400 hover:text-red-400"
                                        loadingMessage="..."
                                        successMessage="Done"
                                    >
                                        Clear All
                                    </ActionButton>
                                )}
                            </div>
                            <div className="space-y-3">
                                {notifications.slice(0, 8).map(note => (
                                    <div
                                        key={note.id || note._id}
                                        className={clsx(
                                            "rounded-xl p-3 border transition-all",
                                            note.type === 'unrecognized_booking'
                                                ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                                                : "bg-white/5 border-white/10 text-white"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={clsx(
                                                "mt-1 p-1 rounded-md",
                                                note.type === 'unrecognized_booking' ? "bg-amber-500 text-amber-950" : "bg-white/10 text-white/70"
                                            )}>
                                                {note.type === 'unrecognized_booking' ? <Lucide.UserPlus size={14} /> : <Lucide.Bell size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-black uppercase tracking-wider mb-0.5 opacity-70">
                                                    {note.type.replace('_', ' ')}
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed">{note.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notifications.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">No notifications</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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

            {staffCreationSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 bg-ocean-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                                <Lucide.ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Staff Account Created!</h2>
                            <p className="text-sm text-slate-600">Please provide these credentials to the user securely.</p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-6 space-y-3">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Email</div>
                                <div className="text-sm font-medium text-slate-900">{staffCreationSuccess.email}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Role</div>
                                <div className="text-sm font-bold text-slate-900 uppercase">{staffCreationSuccess.role}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Temporary Password</div>
                                <div className="text-sm font-mono font-bold text-ocean-600 bg-ocean-50 px-3 py-2 rounded-lg break-all">
                                    {staffCreationSuccess.tempPassword}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setStaffCreationSuccess(null)}
                            className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-800 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <Modal
                open={isAddStaffModalOpen}
                title="Add New Staff Member"
                onClose={() => setIsAddStaffModalOpen(false)}
                footer={
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                        <button onClick={() => setIsAddStaffModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleAddStaff} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800">Create Account</button>
                    </div>
                }
            >
                <form onSubmit={handleAddStaff} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={addStaffForm.email}
                            onChange={e => setAddStaffForm({ ...addStaffForm, email: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500"
                            placeholder="staff@agency.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                        <select
                            value={addStaffForm.role}
                            onChange={e => setAddStaffForm({ ...addStaffForm, role: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500"
                        >
                            <option value="staff">Staff</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            <strong>Staff:</strong> Basic access. <strong>Agent/Admin:</strong> Full access.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Password (Optional)</label>
                        <input
                            type="password"
                            value={addStaffForm.password}
                            onChange={e => setAddStaffForm({ ...addStaffForm, password: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500"
                            placeholder="Leave blank to auto-generate"
                        />
                    </div>
                </form>
            </Modal>

            <Modal
                open={isCreatePassengerModalOpen}
                title="Create New Passenger"
                onClose={() => setIsCreatePassengerModalOpen(false)}
                footer={
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
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
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Airline</label>
                            <input type="text" required value={createBookingForm.airlineName} onChange={e => setCreateBookingForm({ ...createBookingForm, airlineName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Flight Number</label>
                            <input type="text" required value={createBookingForm.flightNumber} onChange={e => setCreateBookingForm({ ...createBookingForm, flightNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                open={isEditModalOpen}
                title="Edit Passenger"
                onClose={() => setIsEditModalOpen(false)}
                footer={
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
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
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Airline</label>
                            <input type="text" required value={editBookingForm.airlineName || ''} onChange={e => setEditBookingForm({ ...editBookingForm, airlineName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Flight Number</label>
                            <input type="text" required value={editBookingForm.flightNumber || ''} onChange={e => setEditBookingForm({ ...editBookingForm, flightNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-ocean-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex gap-2">
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
                                                            href={note.meta.wa_link || `https://wa.me/${(note.meta.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello%20This%20is%20a%20representative%20from%20Dnarai%20Enterprise%2C%20we%20got%20your%20request`}
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
                    <div className="flex justify-between items-center p-4 border-t border-slate-200">
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
                            <div className="flex justify-between items-start mb-6">
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
                                <div className="text-right">
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
                        <div className="p-6 grid grid-cols-2 gap-4">
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

                            <div className="col-span-2 bg-ocean-50 rounded-2xl p-4 border border-ocean-100">
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
                                    setIsBookingDetailsModalOpen(false);
                                    scrollToPassengerList();
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
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
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
                                                        scrollToPassengerList();
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
                title={`Active Bookings (${bookings.filter(b => b.status === 'confirmed').length})`}
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
                    {bookings.filter(b => b.status === 'confirmed').length > 0 ? (
                        <div className="space-y-3">
                            {bookings.filter(b => b.status === 'confirmed').map(b => (
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

            {staffCreationSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-green-500/30">
                            <Lucide.CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Staff Registered!</h2>
                        <p className="text-slate-500 mb-8">Account created successfully for <span className="font-bold text-slate-900">{staffCreationSuccess.user.email}</span></p>

                        <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 mb-8 space-y-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Temporary Password</div>
                                <div className="text-3xl font-black text-ocean-600 font-mono tracking-wider">
                                    {staffCreationSuccess.tempPassword}
                                </div>
                            </div>
                            <div className="text-xs font-bold text-slate-400">
                                Please copy this password and provide it to the new staff member.
                                They will be asked to change it upon first login.
                            </div>
                        </div>

                        <button
                            onClick={() => setStaffCreationSuccess(null)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                        >
                            Done, I Copied It
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}
