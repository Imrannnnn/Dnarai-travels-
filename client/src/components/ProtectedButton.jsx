import { useState } from 'react'

/**
 * ProtectedButton - A button with built-in click protection and loading state
 * Prevents duplicate submissions and provides visual feedback during async operations
 * 
 * @param {Function} onClick - Async function to execute on click
 * @param {string} children - Button text/content
 * @param {string} loadingText - Text to display while loading (default: "Processing...")
 * @param {string} variant - Button style variant: 'primary' | 'secondary' | 'danger'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - External disabled state
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} icon - Optional icon component
 */
export default function ProtectedButton({
    onClick,
    children,
    loadingText = 'Processing...',
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    icon: Icon,
    type = 'button',
    ...props
}) {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleClick = async (e) => {
        // Prevent duplicate clicks
        if (isProcessing || disabled) return

        setIsProcessing(true)
        try {
            await onClick?.(e)
        } catch (error) {
            console.error('Button action failed:', error)
            // You could add error notification here
        } finally {
            setIsProcessing(false)
        }
    }

    // Variant styles
    const variantClasses = {
        primary: 'bg-ocean-600 text-white hover:bg-ocean-700 shadow-lg shadow-ocean-600/20',
        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20',
    }

    // Size styles
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-6 py-2 text-sm',
        lg: 'px-8 py-3 text-base',
    }

    const isDisabled = disabled || isProcessing

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={isDisabled}
            className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-bold uppercase tracking-wide
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95'
                }
        ${className}
      `}
            {...props}
        >
            {isProcessing ? (
                <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{loadingText}</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={18} strokeWidth={2.5} />}
                    <span>{children}</span>
                </>
            )}
        </button>
    )
}
