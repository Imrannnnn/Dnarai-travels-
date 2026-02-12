import { useState } from 'react'
import * as Lucide from 'lucide-react'

/**
 * ActionButton - Reusable button with built-in loading and success states
 * Prevents multiple clicks and shows branded progress
 */
export default function ActionButton({
    children,
    onClick,
    className = "",
    icon: Icon,
    successMessage = "Done",
    loadingMessage = "Processing...",
    variant = "primary" // 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
    const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'

    const variants = {
        primary: "bg-ocean-600 text-white hover:bg-ocean-700 shadow-ocean-600/20",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
    }

    const handleClick = async (e) => {
        if (status !== 'idle') return

        setStatus('loading')
        try {
            await onClick(e)
            setStatus('success')
            setTimeout(() => setStatus('idle'), 2000)
        } catch (err) {
            console.error(err)
            setStatus('error')
            setTimeout(() => setStatus('idle'), 3000)
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={status !== 'idle'}
            className={`
                relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-80 disabled:active:scale-100
                ${variants[variant]}
                ${className}
            `}
        >
            <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${status !== 'idle' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                {Icon && <Icon size={18} />}
                {children}
            </div>

            {/* Loading State Overlay */}
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
                    <div className="h-5 w-5 animate-pulse-slow">
                        <img src="/D-NARAI_Logo 01.svg" alt="" className={`h-full w-full object-contain ${variant === 'primary' || variant === 'danger' ? 'filter brightness-0 invert' : ''}`} />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-black">{loadingMessage}</span>
                </div>
            )}

            {/* Success State Overlay */}
            {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-white bg-emerald-500 rounded-xl animate-in fade-in zoom-in duration-300">
                    <Lucide.Check size={20} className="animate-in slide-in-from-bottom-2 duration-300" strokeWidth={3} />
                    <span className="text-xs uppercase tracking-widest font-black">{successMessage}</span>
                </div>
            )}

            {/* Error State Overlay */}
            {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-white bg-red-500 rounded-xl animate-in fade-in zoom-in duration-300">
                    <Lucide.AlertCircle size={20} />
                    <span className="text-xs uppercase tracking-widest font-black">Failed</span>
                </div>
            )}
        </button>
    )
}
