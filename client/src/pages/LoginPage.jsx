import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../data/AuthContext'
import { login as apiLogin, getApiBaseUrl } from '../data/api'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const baseUrl = getApiBaseUrl()
            const data = await apiLogin({ email, password, baseUrl })
            login(data.accessToken, { role: data.role, email })
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Invalid credentials. Please try again.')
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
                    className="w-[1000px] h-[1000px] object-contain opacity-[0.20] dark:opacity-[0.10]"
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex h-25 w-25 items-center justify-center mb-6">
                        <img
                            src="/D-NARAI_Logo 02.svg"
                            alt="Dnarai Enterprise"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 font-display uppercase tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Enter your credentials to access your dashboard</p>
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
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Password</label>
                                <Link to="/forgot-password" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-ocean-600 dark:text-ocean-400 hover:text-ocean-700 transition-colors">Forgot Password?</Link>
                            </div>
                            <div className="relative group/field">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/field:text-ocean-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 transition-all font-medium"
                                    placeholder="••••••••"
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
                                        <img src="/D-NARAI_Logo 01.svg" alt="Loading" className="h-full w-full object-contain" />
                                    </div>
                                    <span>Authenticating...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Sign In to Dashboard</span>
                                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {"Don't"} have an account? <Link to="/register" className="text-ocean-600 dark:text-ocean-400 font-bold hover:underline underline-offset-4">Create One</Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    &copy; 2026 DNARAI ENTERPRISE &bull; SECURE ACCESS
                </p>
            </div>
        </div>
    )
}
