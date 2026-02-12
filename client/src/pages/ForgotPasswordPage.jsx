import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ text: '', type: '' })

        try {
            // Mocking forgot password request
            await new Promise(resolve => setTimeout(resolve, 1500))
            setMessage({ text: 'A password reset link has been sent to your email.', type: 'success' })
        } catch (err) {
            setMessage({ text: 'Failed to send reset link. Please try again.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ocean-100/20 via-transparent to-transparent relative overflow-hidden">
            {/* Background Logo Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                    src="/D-NARAI_Logo 02.svg"
                    alt=""
                    className="w-[1000px] h-[1000px] object-contain opacity-[0.10] dark:opacity-[0.10]"
                />
            </div>
            <div className="w-full max-w-md relative z-10">
                <div className="mb-8">
                    <Link to="/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-ocean-600 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Sign In
                    </Link>
                </div>

                <div className="text-center mb-10">
                    <div className="inline-flex h-20 w-20 items-center justify-center mb-6">
                        <img
                            src="/D-NARAI_Logo 01.svg"
                            alt="Dnarai Enterprise"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 font-display uppercase tracking-tight">Reset Password</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">We&apos;ll send you a link to recover your account</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-ocean-400 via-ocean-600 to-ocean-400"></div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message.text && (
                            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-widest border ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Account Email</label>
                            <div className="relative group/field">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/field:text-ocean-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all font-medium"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-ocean-600 to-ocean-700 hover:from-ocean-700 hover:to-ocean-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-ocean-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn disabled:opacity-70 disabled:active:scale-100"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 animate-pulse-slow">
                                        <img src="/D-NARAI_Logo 01.svg" alt="Loading" className="h-full w-full object-contain filter brightness-0 invert" />
                                    </div>
                                    <span>Sending Link...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Send Recovery Link</span>
                                    <Send size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}

                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
