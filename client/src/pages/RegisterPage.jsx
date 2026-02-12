import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { register as apiRegister, getApiBaseUrl } from '../data/api'
import { useAppData } from '../data/AppDataContext'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [role] = useState('passenger')
    const [error, setError] = useState('')

    const { triggerOverlay } = useAppData()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            return setError('Passwords do not match')
        }

        setError('')

        triggerOverlay('Creating Your Account...', async () => {
            const baseUrl = getApiBaseUrl()
            await apiRegister({ email, password, role, baseUrl })
            navigate('/login', { state: { message: 'Account created successfully! Please log in.' } })
        })
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
                <div className="text-center mb-10">
                    <div className="inline-flex h-20 w-20 items-center justify-center mb-6">
                        <img
                            src="/D-NARAI_Logo 01.svg"
                            alt="Dnarai Enterprise"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 font-display uppercase tracking-tight">Create Account</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Join Dnarai Enterprise Travel Agency</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-ocean-400 via-ocean-600 to-ocean-400"></div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 animate-shake">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                                {error}
                            </div>
                        )}



                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Email Address</label>
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
                                    placeholder="name@email.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Confirm</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-ocean-600 to-ocean-700 hover:from-ocean-700 hover:to-ocean-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-ocean-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn"
                        >
                            <span>Create Account</span>
                            <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Already have an account? <Link to="/login" className="text-ocean-600 dark:text-ocean-400 font-bold hover:underline underline-offset-4">Sign In</Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    &copy; 2026 DNARAI ENTERPRISE &bull; SECURE SIGNUP
                </p>
            </div>
        </div>
    )
}
