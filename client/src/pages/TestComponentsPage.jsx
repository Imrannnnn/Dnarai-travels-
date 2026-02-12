import { useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import SuccessNotification from '../components/SuccessNotification'

/**
 * TestComponentsPage - A test page to verify all new components work correctly
 * Navigate to this page to test the loading spinner and success notification
 */
export default function TestComponentsPage() {
    const [showSpinner, setShowSpinner] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [spinnerSize, setSpinnerSize] = useState('lg')
    const [isSimulating, setIsSimulating] = useState(false)

    const simulateBooking = async () => {
        if (isSimulating) {
            console.log('⚠️ Already simulating - duplicate blocked!')
            return
        }

        console.log('🚀 Starting simulation...')
        setIsSimulating(true)
        setShowSpinner(true)

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 3000))

        console.log('✅ Simulation complete!')
        setShowSpinner(false)
        setShowSuccess(true)
        setIsSimulating(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white">
                        Component Testing Page
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Test all the new booking workflow components
                    </p>
                </div>

                {/* Test 1: Loading Spinner */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            1. Loading Spinner Test
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Toggle the loading spinner on/off to verify animations work
                        </p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => setShowSpinner(!showSpinner)}
                            className="px-6 py-3 bg-ocean-600 text-white rounded-xl font-bold hover:bg-ocean-700 transition-all"
                        >
                            {showSpinner ? 'Hide' : 'Show'} Spinner
                        </button>

                        <select
                            value={spinnerSize}
                            onChange={(e) => setSpinnerSize(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                            <option value="xl">Extra Large</option>
                        </select>
                    </div>

                    {showSpinner && (
                        <div className="border-4 border-dashed border-ocean-300 dark:border-ocean-700 p-16 rounded-3xl bg-slate-50 dark:bg-slate-900">
                            <LoadingSpinner
                                size={spinnerSize}
                                message="Testing the loading animation..."
                            />
                        </div>
                    )}

                    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-sm font-mono">
                        <div className="font-bold mb-2 text-slate-700 dark:text-slate-300">What to look for:</div>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                            <li>✓ Logo should rotate smoothly (3-second loop)</li>
                            <li>✓ Shine effect should sweep across logo</li>
                            <li>✓ Pulsing ring should animate around logo</li>
                            <li>✓ Message should appear below</li>
                            <li>✓ Check console for &quot;🎨 LoadingSpinner mounted&quot; message</li>
                        </ul>
                    </div>
                </div>

                {/* Test 2: Success Notification */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            2. Success Notification Test
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Trigger a success notification (auto-dismisses after 4 seconds)
                        </p>
                    </div>

                    <button
                        onClick={() => setShowSuccess(true)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                        Show Success Notification
                    </button>

                    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-sm font-mono">
                        <div className="font-bold mb-2 text-slate-700 dark:text-slate-300">What to look for:</div>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                            <li>✓ Notification slides in from right (top-right corner)</li>
                            <li>✓ Green checkmark icon with pulsing effect</li>
                            <li>✓ Auto-dismisses after 4 seconds</li>
                            <li>✓ Can manually close with X button</li>
                        </ul>
                    </div>
                </div>

                {/* Test 3: Full Booking Simulation */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            3. Full Booking Flow Simulation
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Simulates the complete booking flow with 3-second delay
                        </p>
                    </div>

                    <button
                        onClick={simulateBooking}
                        disabled={isSimulating}
                        className="px-6 py-3 bg-ocean-600 text-white rounded-xl font-bold hover:bg-ocean-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSimulating ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            'Simulate Booking'
                        )}
                    </button>

                    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 text-sm font-mono">
                        <div className="font-bold mb-2 text-slate-700 dark:text-slate-300">What to look for:</div>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                            <li>✓ Button disables immediately on click</li>
                            <li>✓ Button shows &quot;Processing...&quot; with spinner</li>
                            <li>✓ Large loading spinner appears below</li>
                            <li>✓ After 3 seconds, success notification appears</li>
                            <li>✓ Button re-enables after completion</li>
                            <li>✓ Try clicking rapidly - should block duplicates</li>
                        </ul>
                    </div>

                    {showSpinner && (
                        <div className="border-4 border-dashed border-ocean-300 dark:border-ocean-700 p-16 rounded-3xl bg-slate-50 dark:bg-slate-900">
                            <LoadingSpinner
                                size="lg"
                                message="Simulating booking submission..."
                            />
                        </div>
                    )}
                </div>

                {/* Console Log Guide */}
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-4">
                    <h2 className="text-2xl font-bold">📊 Console Log Guide</h2>
                    <p className="text-slate-300 text-sm">
                        Open your browser console (F12) and watch for these logs:
                    </p>
                    <div className="bg-slate-950 rounded-xl p-4 font-mono text-sm space-y-1">
                        <div className="text-blue-400">🚀 Starting simulation...</div>
                        <div className="text-purple-400">🎨 LoadingSpinner mounted with message: ...</div>
                        <div className="text-green-400">✅ Simulation complete!</div>
                        <div className="text-purple-400">🎨 LoadingSpinner unmounted</div>
                        <div className="text-yellow-400">⚠️ Already simulating - duplicate blocked!</div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="text-center">
                    <a
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-all"
                    >
                        ← Back to Dashboard
                    </a>
                </div>
            </div>

            {/* Success Notification */}
            {showSuccess && (
                <SuccessNotification
                    message="Test successful! All components working correctly."
                    onClose={() => setShowSuccess(false)}
                />
            )}
        </div>
    )
}
