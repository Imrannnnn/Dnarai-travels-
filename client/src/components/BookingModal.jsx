import { useState } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import AirportAutocomplete from './AirportAutocomplete'

import * as Lucide from 'lucide-react'
import { useAppData } from '../data/AppDataContext'

const Plane = Lucide.Plane
const Calendar = Lucide.Calendar
const MapPin = Lucide.MapPin
const User = Lucide.User
const Phone = Lucide.Phone
const Plus = Lucide.Plus
const Trash2 = Lucide.Trash2

export default function BookingModal({ open, onClose, onSubmit }) {
    const { updatePassengerProfile } = useAppData()
    const [tripType, setTripType] = useState('return') // 'oneway' | 'return' | 'multicity'
    const [legs, setLegs] = useState([
        { departureCity: '', destination: '', departureIata: '', destinationIata: '', date: '' },
        { departureCity: '', destination: '', departureIata: '', destinationIata: '', date: '' }
    ])
    const [formData, setFormData] = useState({
        departureCity: '',
        destination: '',
        departureIata: '',
        destinationIata: '',
        date: '',
        isReturn: false,
        returnDate: '',
        passengers: { adults: 1, children: 0, infants: 0 },
        notes: '',
    })
    const [profileData, setProfileData] = useState({
        fullName: '',
        phone: '',
    })
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
    const [needsProfile, setNeedsProfile] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (status !== 'idle') return

        setStatus('loading')
        setErrorMessage('')

        try {
            const payload = {
                tripType,
                passengers: formData.passengers,
                notes: formData.notes
            }

            if (tripType === 'multicity') {
                payload.departureCity = legs[0].departureCity
                payload.departureIata = legs[0].departureIata
                payload.destination = legs[legs.length - 1].destination
                payload.destinationIata = legs[legs.length - 1].destinationIata
                payload.date = legs[0].date
                payload.isReturn = false
                payload.returnDate = ''
                payload.legs = legs
            } else {
                payload.departureCity = formData.departureCity
                payload.departureIata = formData.departureIata
                payload.destination = formData.destination
                payload.destinationIata = formData.destinationIata
                payload.date = formData.date
                payload.isReturn = tripType === 'return'
                payload.returnDate = tripType === 'return' ? formData.returnDate : ''
                payload.legs = []
            }

            await onSubmit(payload)
            setStatus('success')
            
            // Reset forms
            setFormData({
                departureCity: '', departureIata: '', destination: '', destinationIata: '', date: '', notes: '',
                isReturn: false, returnDate: '', passengers: { adults: 1, children: 0, infants: 0 }
            })
            setTripType('return')
            setLegs([
                { departureCity: '', destination: '', departureIata: '', destinationIata: '', date: '' },
                { departureCity: '', destination: '', departureIata: '', destinationIata: '', date: '' }
            ])

            setTimeout(() => {
                onClose()
                setStatus('idle')
            }, 6000)
        } catch (error) {
            console.error('Booking submission failed:', error)
            if (error.status === 403 && error.code === 'FORBIDDEN') {
                setNeedsProfile(true)
                setStatus('idle')
            } else {
                setErrorMessage(error.message || 'Something went wrong. Please try again.')
                setStatus('idle')
            }
        }
    }

    const handleProfileSubmit = async (e) => {
        if (e) e.preventDefault()
        setStatus('loading')
        setErrorMessage('')

        try {
            await updatePassengerProfile(profileData)
            setNeedsProfile(false)
            setStatus('idle')
            // Now that profile is setup, try submitting the booking again
            handleSubmit()
        } catch (error) {
            setErrorMessage(error.message || 'Profile setup failed. Please check your details.')
            setStatus('idle')
        }
    }

    const handleClose = () => {
        if (status === 'loading') return
        onClose()
        // Reset state after a delay or on next open
        setNeedsProfile(false)
        setStatus('idle')
        setErrorMessage('')
    }

    return (
        <Modal
            open={open}
            title={needsProfile ? "Complete Your Profile" : "Request New Journey"}
            onClose={handleClose}
        >
            {status !== 'idle' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    {status === 'loading' ? (
                        <LoadingSpinner
                            size="lg"
                            message={needsProfile ? "Linking your account..." : "Submitting your booking request..."}
                            status="loading"
                        />
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                                    <Lucide.CheckCircle size={40} strokeWidth={3} />
                                </div>
                            </div>
                            <div className="space-y-3 px-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Request Sent</h3>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                                    A representative from <span className="font-bold text-ocean-600 dark:text-ocean-400">Dnarai Enterprise</span> will reach out to you in less than 15 minutes via WhatsApp or call.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : needsProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="bg-ocean-50 dark:bg-ocean-950/30 p-4 rounded-2xl border border-ocean-100 dark:border-ocean-900/50 mb-6">
                        <p className="text-sm text-ocean-800 dark:text-ocean-200 font-medium leading-relaxed">
                            To continue with your booking, please link your account by providing your full name and contact details. This only needs to be done once.
                        </p>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                            {errorMessage}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Full Name (Surname, Firstname)
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                    placeholder="e.g. DOE, John"
                                    value={profileData.fullName}
                                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                WhatsApp Number
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                    placeholder="+234..."
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="group relative rounded-xl bg-ocean-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-[1.02] active:scale-95"
                        >
                            Link Account & Continue
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                            {errorMessage}
                        </div>
                    )}
                    <div className="space-y-5">
                        {/* Journey Type Selector */}
                        <div className="p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl flex items-center border border-slate-200/50 dark:border-slate-800/50">
                            {[
                                { id: 'oneway', label: 'One Way' },
                                { id: 'return', label: 'Return Ticket' },
                                { id: 'multicity', label: 'Multi-city' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setTripType(type.id)}
                                    className={`flex-1 rounded-xl py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                                        tripType === type.id
                                            ? 'bg-white dark:bg-slate-800 text-ocean-600 dark:text-ocean-400 shadow-md scale-[1.01] border border-black/5 dark:border-white/5'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {tripType !== 'multicity' ? (
                            <div className="space-y-4">
                                <AirportAutocomplete
                                    label="Departing From"
                                    icon={Plane}
                                    value={formData.departureCity}
                                    onChange={(val) => setFormData(prev => ({ ...prev, departureCity: val }))}
                                    onSelect={(airport) => setFormData(prev => ({ ...prev, departureIata: airport.iata }))}
                                    placeholder="Origin City or Airport Code"
                                    required
                                />

                                <AirportAutocomplete
                                    label="Where to?"
                                    icon={MapPin}
                                    value={formData.destination}
                                    onChange={(val) => setFormData(prev => ({ ...prev, destination: val }))}
                                    onSelect={(airport) => setFormData(prev => ({ ...prev, destinationIata: airport.iata }))}
                                    placeholder="City, Country or Airport Code"
                                    required
                                />

                                {tripType === 'oneway' ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            Departure Date
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Calendar size={18} />
                                            </div>
                                            <input
                                                type="date"
                                                required
                                                className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                Departure Date
                                            </label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Calendar size={18} />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                                    value={formData.date}
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-ocean-600 dark:text-ocean-400">
                                                Return Date
                                            </label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Calendar size={18} />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                                    value={formData.returnDate}
                                                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Flights / Leg Details</h4>
                                    <span className="text-[10px] bg-ocean-50 text-ocean-600 dark:bg-ocean-950/30 dark:text-ocean-400 font-bold px-2.5 py-1 rounded-full border border-ocean-100/50 dark:border-ocean-900/30">
                                        {legs.length} Legs
                                    </span>
                                </div>
                                <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                                    {legs.map((leg, index) => (
                                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl relative space-y-4 shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black uppercase tracking-widest text-ocean-600 dark:text-ocean-400">Flight {index + 1}</span>
                                                {legs.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLegs(legs.filter((_, idx) => idx !== index));
                                                        }}
                                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> Remove
                                                    </button>
                                                )}
                                            </div>
                                            <AirportAutocomplete
                                                label="Departing From"
                                                icon={Plane}
                                                value={leg.departureCity}
                                                onChange={(val) => {
                                                    const newLegs = [...legs];
                                                    newLegs[index].departureCity = val;
                                                    setLegs(newLegs);
                                                }}
                                                onSelect={(airport) => {
                                                    const newLegs = [...legs];
                                                    newLegs[index].departureIata = airport.iata;
                                                    setLegs(newLegs);
                                                }}
                                                placeholder="Origin City or Airport Code"
                                                required
                                            />
                                            <AirportAutocomplete
                                                label="Where to?"
                                                icon={MapPin}
                                                value={leg.destination}
                                                onChange={(val) => {
                                                    const newLegs = [...legs];
                                                    newLegs[index].destination = val;
                                                    setLegs(newLegs);
                                                }}
                                                onSelect={(airport) => {
                                                    const newLegs = [...legs];
                                                    newLegs[index].destinationIata = airport.iata;
                                                    setLegs(newLegs);
                                                }}
                                                placeholder="City, Country or Airport Code"
                                                required
                                            />
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                    Departure Date
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <input
                                                        type="date"
                                                        required
                                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                                        value={leg.date}
                                                        onChange={(e) => {
                                                            const newLegs = [...legs];
                                                            newLegs[index].date = e.target.value;
                                                            setLegs(newLegs);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLegs([...legs, { departureCity: '', destination: '', departureIata: '', destinationIata: '', date: '' }]);
                                    }}
                                    className="w-full py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-ocean-600 dark:text-ocean-400 border border-dashed border-slate-300 dark:border-slate-700 hover:border-ocean-500 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-98"
                                >
                                    <Plus size={16} /> Add Next Leg / City
                                </button>
                            </div>
                        )}

                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                                Passengers
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Adults', key: 'adults', min: 1 },
                                    { label: 'Children', key: 'children', min: 0 },
                                    { label: 'Infants', key: 'infants', min: 0 }
                                ].map((type) => (
                                    <div key={type.key} className="space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase text-center">{type.label}</div>
                                        <div className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    passengers: {
                                                        ...prev.passengers,
                                                        [type.key]: Math.max(type.min, prev.passengers[type.key] - 1)
                                                    }
                                                }))}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                                            >
                                                -
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center">{formData.passengers[type.key]}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    passengers: {
                                                        ...prev.passengers,
                                                        [type.key]: prev.passengers[type.key] + 1
                                                    }
                                                }))}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Additional Notes
                            </label>
                            <textarea
                                className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                rows={3}
                                placeholder="Business class, dietary requirements, layover preferences..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="group relative rounded-xl bg-ocean-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-[1.02] active:scale-95"
                        >
                            Send Request
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
