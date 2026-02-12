import { useState } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import SuccessNotification from './SuccessNotification'
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
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Prevent duplicate submissions
        if (isSubmitting) {
            console.log('⚠️ Duplicate submission blocked!')
            return
        }

        console.log('🚀 Starting booking submission...')
        setIsSubmitting(true)

        // Small delay to ensure React updates the DOM before API call
        await new Promise(resolve => setTimeout(resolve, 100))

        try {
            console.log('📤 Calling API with data:', formData)
            // Call the onSubmit handler (which will make the API call)
            await onSubmit(formData)

            console.log('✅ Booking submitted successfully!')
            // Show success notification
            setShowSuccess(true)

            // Reset form
            setFormData({ departureCity: '', destination: '', date: '', notes: '' })

            // Close modal after a brief delay to show success
            setTimeout(() => {
                onClose()
                setShowSuccess(false)
            }, 1500)
        } catch (error) {
            console.error('❌ Booking submission failed:', error)
            // In a production app, you'd show an error notification here
        } finally {
            console.log('🔄 Resetting submission state...')
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        // Don't allow closing while submitting
        if (isSubmitting) return
        onClose()
    }

    return (
        <>
            <Modal
                open={open}
                title="Request New Journey"
                onClose={handleClose}
            >
                {isSubmitting ? (
                    // Loading state with animated logo
                    <div className="py-16">
                        <LoadingSpinner
                            size="lg"
                            message="Submitting your booking request..."
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
                                        disabled={isSubmitting}
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={isSubmitting}
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={isSubmitting}
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    disabled={isSubmitting}
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={isSubmitting}
                                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative rounded-xl bg-ocean-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-ocean-600"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Send Request'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Success notification */}
            {showSuccess && (
                <SuccessNotification
                    message="Booking request submitted successfully!"
                    onClose={() => setShowSuccess(false)}
                />
            )}
        </>
    )
}
