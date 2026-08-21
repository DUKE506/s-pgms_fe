import { CircleAlert, CircleCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type ToastVariant } from '../hooks/useToastStore'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-blue-200 bg-blue-50',
  error: 'border-red-200 bg-red-50',
}

const VARIANT_ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-blue-600',
  error: 'text-red-600',
}

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  success: CircleCheck,
  error: CircleAlert,
}

function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon = VARIANT_ICON[toast.variant]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-card-foreground shadow-lg',
              VARIANT_STYLES[toast.variant],
            )}
          >
            <Icon className={cn('size-4 shrink-0', VARIANT_ICON_STYLES[toast.variant])} />
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport
