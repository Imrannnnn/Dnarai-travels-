import { useState } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import * as Lucide from 'lucide-react'
import { useAppData } from '../data/AppDataContext'

export default function ProfileSetupModal({ open, onClose }) {
    const { updatePassengerProfile } = useAppData()
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
    })
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success'
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        setStatus('loading')
        setErrorMessage('')

        try {
            await updatePassengerProfile(formData)
            setStatus('success')

            setTimeout(() => {
                onClose()
                setStatus('idle')
            }, 3000)
        } catch (error) {
            setErrorMessage(error.message || 'Profile setup failed. Please try again.')
            setStatus('idle')
        }
    }

    const handleClose = () => {
        if (status === 'loading') return
        onClose()
        setStatus('idle')
        setErrorMessage('')
    }

    return (
        <Modal
            open={open}
            title="Complete Your Profile"
            onClose={handleClose}
        >
            {status !== 'idle' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    {status === 'loading' ? (
                        <LoadingSpinner
                            size="lg"
                            message="Linking your account..."
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
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Account Linked</h3>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                                    Your passenger profile has been successfully updated and linked. You can now request bookings.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-ocean-50 dark:bg-ocean-950/30 p-6 rounded-3xl border border-ocean-100 dark:border-ocean-900/50 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-xl bg-ocean-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-ocean-600/20">
                                <Lucide.ShieldCheck size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-ocean-900 dark:text-ocean-100 uppercase tracking-tight">Identity Verification</h4>
                                <p className="text-sm text-ocean-700/80 dark:text-ocean-300 font-medium leading-relaxed">
                                    Dnarai Enterprise requires a verified passenger profile to manage your global itineraries. This links your login directly to our operations center.
                                </p>
                            </div>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                            {errorMessage}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Full Name (Surname, Firstname)
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lucide.User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
                                    placeholder="e.g. DOE, John"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                WhatsApp Number
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lucide.Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
                                    placeholder="+234..."
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-400 transition-all font-display uppercase tracking-widest"
                        >
                            Later
                        </button>
                        <button
                            type="submit"
                            className="group relative rounded-xl bg-ocean-600 px-10 py-3 text-sm font-black text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-[1.02] active:scale-95 uppercase tracking-widest font-display"
                        >
                            Link My Account
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
