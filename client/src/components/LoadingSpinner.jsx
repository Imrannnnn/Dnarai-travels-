import { useEffect } from 'react'

/**
 * LoadingSpinner - Animated logo spinner for loading states
 * Features a rotating shine effect on the Dnarai logo
 */
export default function LoadingSpinner({ size = 'md', message = 'Processing...' }) {
    useEffect(() => {
        console.log('🎨 LoadingSpinner mounted with message:', message)
        return () => {
            console.log('🎨 LoadingSpinner unmounted')
        }
    }, [message])

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



    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative group">
                {/* Outer decorative ring */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-2 border-ocean-100 dark:border-slate-800 animate-pulse-slow`} />

                {/* Spinning decorative orbit */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-t-2 border-ocean-500 animate-spin-slow opacity-60`} />

                {/* Main logo with fainting/pulsing effect */}
                <div className={`${sizeClasses[size]} relative p-4 flex items-center justify-center animate-pulse-slow transition-transform duration-700 hover:scale-110`}>
                    <img
                        src="/D-NARAI_Logo 01.svg"
                        alt="Dnarai Logo"
                        className="h-full w-full object-contain filter drop-shadow-2xl"
                    />

                    {/* Shine effect overlay */}
                    <div
                        className="absolute inset-0 animate-shine rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                            backgroundSize: '300% 300%',
                            mixBlendMode: 'overlay'
                        }}
                    />
                </div>

                {/* Pulsing glow ring */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border border-ocean-400/20 animate-ping opacity-20`} />
            </div>

            {message && (
                <div className="space-y-2 text-center">
                    <p className={`${textSizeClasses[size]} font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white animate-pulse`}>
                        {message}
                    </p>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-ocean-500 to-transparent mx-auto rounded-full overflow-hidden">
                        <div className="h-full w-full bg-white/50 animate-shine" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                </div>
            )}
        </div>
    )

}
