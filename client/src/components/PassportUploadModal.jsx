import { useState, useRef } from 'react'
import Modal from './Modal'
import LoadingSpinner from './LoadingSpinner'
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
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success'
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (!file || status !== 'idle') return

        setStatus('loading')

        try {
            await onUpload({ ...formData, file, fileName: file.name })
            setStatus('success')

            // Reset form
            setFormData({ number: '', expiry: '', country: '' })
            setFile(null)

            setTimeout(() => {
                onClose()
                setStatus('idle')
            }, 2000)
        } catch (error) {
            console.error('Passport upload failed:', error)
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
            title="Upload International Passport"
            onClose={handleClose}
        >
            {status !== 'idle' ? (
                <div className="py-16">
                    <LoadingSpinner
                        size="lg"
                        message={status === 'success' ? "Passport Verified!" : "Securely uploading your documents..."}
                        status={status === 'success' ? 'success' : 'loading'}
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
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
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
                                    className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
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
                                className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 px-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                                className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 px-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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
                                className="w-full rounded-2xl border border-sand-200 bg-sand-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 focus:border-ocean-500 focus:ring-1 focus:ring-ocean-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                value={formData.expiry}
                                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
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
                            disabled={!file}
                            className="group relative rounded-xl bg-ocean-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-600/20 transition-all hover:bg-ocean-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Secure Upload
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
