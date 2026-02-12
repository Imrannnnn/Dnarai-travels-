import LoadingSpinner from './LoadingSpinner'

/**
 * LoadingOverlay - Full screen or container-relative loading overlay
 * Uses the branded LoadingSpinner with the fainting logo effect
 */
export default function LoadingOverlay({ message = 'Loading your travel data...', fullScreen = true }) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center"
        : "absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[inherit]";

    return (
        <div className={containerClasses}>
            <LoadingSpinner size="lg" message={message} />
        </div>
    )
}
