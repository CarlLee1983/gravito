import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { cn } from '../utils'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
  isProcessing?: boolean
}

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-card border rounded-2xl p-6 max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  'px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2',
                  variant === 'danger' && 'bg-red-500 hover:bg-red-600',
                  variant === 'warning' && 'bg-amber-500 hover:bg-amber-600',
                  variant === 'info' && 'bg-blue-500 hover:bg-blue-600'
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
                {isProcessing ? 'Processing...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
