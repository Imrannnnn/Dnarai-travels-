import { useState, useEffect } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import * as Lucide from 'lucide-react'

const Calendar = Lucide.Calendar
const Globe = Lucide.Globe
const User = Lucide.User
const Hash = Lucide.Hash
const Shield = Lucide.Shield

export default function PassportUploadModal({ open, onClose, onUpload, passenger }) {
    const [formData, setFormData] = useState({
        passportNumber: '',
        issueDate: '',
        dob: '',
        passportName: '',
        expiryDate: '',
        countryIssue: '',
    })
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success'

    // Pre-populate when modal opens or passenger updates
    useEffect(() => {
        if (open && passenger) {
            // Helper to format date object/string to YYYY-MM-DD for native input type="date"
            const formatDate = (dateVal) => {
                if (!dateVal) return ''
                try {
                    const d = new Date(dateVal)
                    if (isNaN(d.getTime())) return ''
                    return d.toISOString().split('T')[0]
                } catch (e) {
                    return ''
                }
            }

            setFormData({
                passportNumber: passenger.passportNumber || '',
                issueDate: formatDate(passenger.passportIssueDate),
                dob: formatDate(passenger.passportDob),
                passportName: passenger.passportName || '',
                expiryDate: formatDate(passenger.passportExpiryDate),
                countryIssue: passenger.passportCountryIssue || '',
            })
        }
    }, [open, passenger])

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (status !== 'idle') return

        setStatus('loading')

        try {
            await onUpload(formData)
            setStatus('success')

            setTimeout(() => {
                onClose()
                setStatus('idle')
            }, 1500)
        } catch (error) {
            console.error('Passport update failed:', error)
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
            title="Passport Details Verification"
            onClose={handleClose}
        >
            {status !== 'idle' ? (
                <div className="py-16">
                    <LoadingSpinner
                        size="lg"
                        message={status === 'success' ? "Passport Details Updated!" : "Securing and encrypting passport details..."}
                        status={status === 'success' ? 'success' : 'loading'}
                    />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Please provide your official passport details. These sensitive records are encrypted at rest with industry-standard AES-256-GCM.
                    </p>

                    <div className="space-y-4">
                        {/* Name as it appears on passport */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Name (As it appears on passport)
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                    placeholder="JOHN DOE"
                                    value={formData.passportName}
                                    onChange={(e) => setFormData({ ...formData, passportName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Passport Number */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Passport Number
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Hash size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                        placeholder="A12345678"
                                        value={formData.passportNumber}
                                        onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Country Issue */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Country of Issue
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Globe size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                        placeholder="e.g. Nigeria"
                                        value={formData.countryIssue}
                                        onChange={(e) => setFormData({ ...formData, countryIssue: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date of Birth (DOB) */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Date of Birth (DOB)
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Calendar size={18} />
                                </div>
                                <input
                                    type="date"
                                    required
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Issue Date */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Issue Date
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Calendar size={18} />
                                    </div>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                        value={formData.issueDate}
                                        onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Expiry Date */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Expiry Date
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Calendar size={18} />
                                    </div>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full sm:w-auto rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto group flex items-center justify-center gap-2 rounded-xl bg-ocean-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 active:scale-95"
                        >
                            <Shield size={14} />
                            <span>Save & Encrypt</span>
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
