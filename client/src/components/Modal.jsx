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

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto px-6 py-5">{children}</div>

          {footer ? (
            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
