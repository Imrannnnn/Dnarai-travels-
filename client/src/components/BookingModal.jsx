import { useState } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import * as Lucide from 'lucide-react'

const Plane = Lucide.Plane
const Calendar = Lucide.Calendar
const MapPin = Lucide.MapPin

export default function BookingModal({ open, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        departureCity: '',
        destination: '',
        date: '',
        notes: '',
    })
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success'

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()

        if (status !== 'idle') return

        setStatus('loading')

        try {
            await onSubmit(formData)
            setStatus('success')
            setFormData({ departureCity: '', destination: '', date: '', notes: '' })

            setTimeout(() => {
                onClose()
                setStatus('idle')
            }, 2000)
        } catch (error) {
            console.error('Booking submission failed:', error)
            setStatus('idle')
        }
    }

    const handleClose = () => {
        if (status !== 'idle') return
        onClose()
    }

    return (
        <Modal
            open={open}
            title="Request New Journey"
            onClose={handleClose}
        >
            {status !== 'idle' ? (
                <div className="py-16">
                    <LoadingSpinner
                        size="lg"
                        message={status === 'success' ? "Booking confirmed!" : "Submitting your booking request..."}
                        status={status === 'success' ? 'success' : 'loading'}
                    />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Departing From
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Plane size={18} className="rotate-0" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                    placeholder="Origin City or Airport Code"
                                    value={formData.departureCity}
                                    onChange={(e) => setFormData({ ...formData, departureCity: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Where to?
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <MapPin size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                    placeholder="City, Country or Airport Code"
                                    value={formData.destination}
                                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Preferred Date
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
