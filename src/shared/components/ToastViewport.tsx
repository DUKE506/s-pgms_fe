import { useToastStore } from '../hooks/useToastStore'

// 기능만 갖춘 최소 구현. 스타일은 Phase 0 "공용 UI 최소 세트" 작업에서 입힌다.
function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 16, right: 16 }}>
      {toasts.map((toast) => (
        <div key={toast.id}>{toast.message}</div>
      ))}
    </div>
  )
}

export default ToastViewport
