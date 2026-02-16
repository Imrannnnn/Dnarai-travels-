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

export default function BookingModal({ open, onClose, onSubmit }) {
    const { updatePassengerProfile } = useAppData()
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
            await onSubmit(formData)
            setStatus('success')
            setFormData({
                departureCity: '', destination: '', date: '', notes: '',
                isReturn: false, returnDate: '', passengers: { adults: 1, children: 0, infants: 0 }
            })

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
                                <div className="flex justify-between items-center">
                                    <label className={`text-xs font-bold uppercase tracking-widest ${formData.isReturn ? 'text-ocean-600 dark:text-ocean-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Return Flight?
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isReturn}
                                        onChange={(e) => setFormData({ ...formData, isReturn: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-ocean-600 focus:ring-ocean-600"
                                    />
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Calendar size={18} />
                                    </div>
                                    <input
                                        type="date"
                                        disabled={!formData.isReturn}
                                        required={formData.isReturn}
                                        className={`w-full rounded-2xl border bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:bg-slate-900 dark:text-white transition-all ${formData.isReturn
                                                ? 'border-sand-200 text-slate-900 dark:border-slate-800'
                                                : 'border-transparent text-slate-400 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed'
                                            }`}
                                        value={formData.returnDate}
                                        onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

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
