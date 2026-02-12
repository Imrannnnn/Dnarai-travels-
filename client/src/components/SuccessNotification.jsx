import { useEffect, useState } from 'react'
import * as Lucide from 'lucide-react'

/**
 * SuccessNotification - Toast-style success message
 * Auto-dismisses after a configurable duration
 */
export default function SuccessNotification({
    message = 'Success!',
    duration = 4000,
    onClose
}) {
    const [visible, setVisible] = useState(false)
    const [exiting, setExiting] = useState(false)

    useEffect(() => {
        // Trigger entrance animation
        const showTimer = setTimeout(() => setVisible(true), 10)

        // Auto-dismiss after duration
        const hideTimer = setTimeout(() => {
            setExiting(true)
            setTimeout(() => {
                setVisible(false)
                onClose?.()
            }, 300) // Match exit animation duration
        }, duration)

        return () => {
            clearTimeout(showTimer)
            clearTimeout(hideTimer)
        }
    }, [duration, onClose])

    if (!visible && !exiting) return null

    return (
        <div className="fixed top-6 right-6 z-[9999] pointer-events-none">
            <div
                className={`
          pointer-events-auto
          flex items-center gap-4 
          bg-white dark:bg-slate-900 
          border-2 border-emerald-500/30 
          rounded-2xl 
          px-6 py-4 
          shadow-2xl shadow-emerald-500/20
          transition-all duration-300 ease-out
          ${visible && !exiting
                        ? 'translate-x-0 opacity-100'
                        : 'translate-x-[120%] opacity-0'
                    }
        `}
            >
                {/* Success icon with animation */}
                <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Lucide.Check className="w-6 h-6 text-white" strokeWidth={3} />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                </div>

                {/* Message */}
                <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {message}
                    </p>
                </div>

                {/* Close button */}
                <button
                    onClick={() => {
                        setExiting(true)
                        setTimeout(() => {
                            setVisible(false)
                            onClose?.()
                        }, 300)
                    }}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <Lucide.X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
