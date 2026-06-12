import { useEffect } from 'react'

export default function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
        onClick={() => onClose?.()}
      />

      {/* Modal Container */}
      <div className="relative w-full max-h-[85dvh] sm:max-h-[90dvh] sm:max-w-3xl flex flex-col bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 opacity-100 z-10 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="min-w-0">
            <h3 className="truncate text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight font-display">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-900 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 dark:bg-slate-950">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="border-t border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/30">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
