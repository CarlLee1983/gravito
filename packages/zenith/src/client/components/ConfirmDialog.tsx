import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

/**
 * Props for the ConfirmDialog component.
 *
 * @public
 * @since 3.0.0
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  open: boolean
  /** Dialog title text. */
  title: string
  /** Detailed confirmation message. */
  message: string
  /** Text for the confirmation button. @default 'Confirm' */
  confirmText?: string
  /** Text for the cancel button. @default 'Cancel' */
  cancelText?: string
  /** Callback triggered when user confirms the action. */
  onConfirm: () => void
  /** Callback triggered when user cancels the action. */
  onCancel: () => void
  /** Visual style of the confirmation button. @default 'danger' */
  variant?: 'danger' | 'warning' | 'info'
  /** Whether an action is currently in progress (shows a spinner). @default false */
  isProcessing?: boolean
}

/**
 * A modal dialog used for user confirmation before performing sensitive actions.
 *
 * It provides a consistent UI for confirmations across the Zenith dashboard
 * and supports different visual variants.
 *
 * @public
 * @since 3.0.0
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  isProcessing = false,
}: ConfirmDialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Backdrop needs click handler to stop propagation
        <div
          role="presentation"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[5000] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] scanline overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black mb-3 font-heading tracking-tight text-white uppercase italic italic">
              {title}
            </h3>
            <div className="h-px w-full bg-white/5 mb-6" />
            <p className="text-[13px] font-bold text-muted-foreground mb-8 leading-relaxed uppercase tracking-wide opacity-80">
              {message}
            </p>
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                }}
                disabled={isProcessing}
                className="px-6 py-3 bg-zinc-800 text-white/60 rounded-xl hover:bg-zinc-700 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-[0.2em] font-heading border border-white/5"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
                disabled={isProcessing}
                className={cn(
                  'px-6 py-3 rounded-xl text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] font-heading shadow-lg',
                  variant === 'danger' &&
                    'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-400',
                  variant === 'warning' &&
                    'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400',
                  variant === 'info' &&
                    'bg-primary shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary/80'
                )}
              >
                {isProcessing && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-label="Loading">
                    <title>Loading</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isProcessing ? 'Executing...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
