import { useState, useRef } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
import SuccessNotification from './SuccessNotification'
import * as Lucide from 'lucide-react'

const Upload = Lucide.Upload
const FileText = Lucide.FileText
const Calendar = Lucide.Calendar

export default function PassportUploadModal({ open, onClose, onUpload }) {
    const [file, setFile] = useState(null)
    const [formData, setFormData] = useState({
        number: '',
        expiry: '',
        country: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!file || isSubmitting) return

        setIsSubmitting(true)

        try {
            // Call the onUpload handler (which should make the API call)
            await onUpload({ ...formData, file, fileName: file.name })

            // Show success notification
            setShowSuccess(true)

            // Reset form
            setFormData({ number: '', expiry: '', country: '' })
            setFile(null)

            // Close modal after a brief delay
            setTimeout(() => {
                onClose()
                setShowSuccess(false)
            }, 1500)
        } catch (error) {
            console.error('Passport upload failed:', error)
            // In a production app, you'd show an error notification here
        } finally {
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
                title="Upload International Passport"
                onClose={handleClose}
            >
                {isSubmitting ? (
                    // Loading state with animated logo
                    <div className="py-16">
                        <LoadingSpinner
                            size="lg"
                            message="Securely uploading your passport..."
                        />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* File Upload Zone */}
                        <div
                            className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sand-300 bg-sand-50/30 p-8 text-center transition hover:border-ocean-400 hover:bg-ocean-50/10 cursor-pointer dark:border-slate-700 dark:bg-slate-900/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                required
                                disabled={isSubmitting}
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success-50 text-success-600">
                                        <FileText size={24} />
                                    </div>
                                    <div className="font-bold text-slate-900 dark:text-white">{file.name}</div>
                                    <div className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFile(null)
                                        }}
                                        disabled={isSubmitting}
                                        className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Change File
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
                                        <Upload size={24} className="text-ocean-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">Click to upload passport</div>
                                        <div className="mt-1 text-xs text-slate-500">PDF, JPG or PNG (Max 5MB)</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    Passport Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={isSubmitting}
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 px-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="A12345678"
                                    value={formData.number}
                                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    Issuing Country
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={isSubmitting}
                                    className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 px-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="e.g. Nigeria"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Expiration Date (Important)
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
                                    value={formData.expiry}
                                    onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 pl-1">
                                We use this date to send you expiration reminders automatically.
                            </p>
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
                                disabled={!file || isSubmitting}
                                className="group relative rounded-xl bg-ocean-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-ocean-600"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-pulse-slow">
                                            <img src="/D-NARAI_Logo 01.svg" alt="Loading" className="h-full w-full object-contain filter brightness-0 invert" />
                                        </div>
                                        Uploading...
                                    </span>

                                ) : (
                                    'Secure Upload'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Success notification */}
            {showSuccess && (
                <SuccessNotification
                    message="Passport uploaded successfully!"
                    onClose={() => setShowSuccess(false)}
                />
            )}
        </>
    )
}
