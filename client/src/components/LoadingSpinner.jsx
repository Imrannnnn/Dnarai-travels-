import { useEffect } from 'react'
import * as Lucide from 'lucide-react'

/**
 * LoadingSpinner - Animated logo spinner for loading states
 * Features a rotating shine effect on the Dnarai logo and a success state
 */
export default function LoadingSpinner({
    size = 'md',
    message = 'Processing...',
    status = 'loading' // 'loading' | 'success' | 'done' | 'error'
}) {
    useEffect(() => {
        console.log(`🎨 LoadingSpinner status: ${status}, message: ${message}`)
    }, [message, status])

    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-16 w-16',
        lg: 'h-24 w-24',
        xl: 'h-32 w-32'
    }

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg'
    }

    const isDone = status === 'success' || status === 'done';

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative group">
                {/* Outer decorative ring */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-2 border-ocean-100 dark:border-slate-800 ${!isDone ? 'animate-pulse-slow' : 'border-emerald-500/30'}`} />

                {/* Spinning decorative orbit - only show when loading */}
                {!isDone && (
                    <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-t-2 border-ocean-500 animate-spin-slow opacity-60`} />
                )}

                {/* Main Content Area */}
                <div className={`${sizeClasses[size]} relative p-4 flex items-center justify-center transition-all duration-700`}>
                    {isDone ? (
                        <div className="bg-emerald-500 rounded-full p-3 shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
                            <Lucide.Check size={size === 'sm' ? 16 : 32} className="text-white" strokeWidth={4} />
                        </div>
                    ) : (
                        <div className="animate-pulse-slow">
                            <img
                                src="/D-NARAI_Logo 01.svg"
                                alt="Dnarai Logo"
                                className="h-full w-full object-contain filter drop-shadow-2xl"
                            />
                        </div>
                    )}

                    {/* Shine effect overlay - only show when loading */}
                    {!isDone && (
                        <div
                            className="absolute inset-0 animate-shine rounded-full"
                            style={{
                                background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                                backgroundSize: '300% 300%',
                                mixBlendMode: 'overlay'
                            }}
                        />
                    )}
                </div>

                {/* Pulsing glow ring */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border border-ocean-400/20 animate-ping opacity-20`} />
            </div>

            {message && (
                <div className="space-y-2 text-center">
                    <p className={`${textSizeClasses[size]} font-black uppercase tracking-[0.3em] ${isDone ? 'text-emerald-500' : 'text-slate-800 dark:text-white'} animate-pulse`}>
                        {isDone ? 'Action Completed' : message}
                    </p>
                    <div className={`h-0.5 w-12 mx-auto rounded-full overflow-hidden transition-all duration-500 ${isDone ? 'bg-emerald-500 w-24' : 'bg-gradient-to-r from-transparent via-ocean-500 to-transparent'}`}>
                        {!isDone && (
                            <div className="h-full w-full bg-white/50 animate-shine" style={{ backgroundSize: '200% 100%' }} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
