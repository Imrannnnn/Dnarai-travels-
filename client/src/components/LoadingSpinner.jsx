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
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
                {/* Main logo with pulsing/fading effect (no rotation) */}
                <div className={`${sizeClasses[size]} relative animate-pulse-slow`}>
                    <img
                        src="/D-NARAI_Logo 01.svg"
                        alt="Loading"
                        className="h-full w-full object-contain"
                    />
                </div>

                {/* Shine effect overlay */}
                <div
                    className={`${sizeClasses[size]} absolute inset-0 animate-shine`}
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                    }}
                />

                {/* Pulsing ring */}
                <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-2 border-ocean-400/30 animate-ping`} />
            </div>

            {message && (
                <p className={`${textSizeClasses[size]} font-semibold text-slate-600 dark:text-slate-400 animate-pulse`}>
                    {message}
                </p>
            )}
        </div>
    )
}
