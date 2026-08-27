import { cn } from '@/lib/utils'

export type SecurityCaseStatus = '접수' | '배정' | '경호중' | '경호완료' | '종결' | '취소'

const STATUS_COLOR: Record<SecurityCaseStatus, string> = {
  접수: 'bg-status-received',
  배정: 'bg-status-assigned',
  경호중: 'bg-status-active',
  경호완료: 'bg-status-completed',
  종결: 'bg-status-closed',
  취소: 'bg-status-cancelled',
}

interface StatusBadgeProps {
  status: SecurityCaseStatus
  className?: string
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        // 11px: 목업 실측값(docs/PGMS_UI_mock.dc.html 리스트 행 상태뱃지 기준, 2026-08-22)
        // h-6: text-trim이 line-height의 leading을 걷어내면서 기존 py-1 기반
        // 높이(약 23.7px)가 같이 줄어드는 걸 막기 위해 고정 높이로 전환 (2026-08-27)
        'inline-flex h-6 items-center rounded-md px-3 text-[11px] font-semibold text-white',
        STATUS_COLOR[status],
        className,
      )}
    >
      <span className="text-trim">{status}</span>
    </span>
  )
}

export default StatusBadge
