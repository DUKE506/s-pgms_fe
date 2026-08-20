import { useToastStore } from '../hooks/useToastStore'

function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default ToastViewport
