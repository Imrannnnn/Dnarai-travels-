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
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onClose?.()}
      />

      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full h-full sm:h-auto sm:max-w-3xl flex flex-col overflow-hidden bg-white dark:bg-slate-950 sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800 shrink-0">
            <div className="min-w-0">
              <div className="truncate text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>

          {footer ? (
            <div className="border-t border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800 shrink-0">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
