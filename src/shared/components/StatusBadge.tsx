import { cn } from '@/lib/utils'

export type SecurityCaseStatus = '접수' | '배정' | '경호중' | '경호완료' | '종결' | '취소'

// outline 스타일(테두리+옅은 배경+진한 글자, 2026-09-18 개편) — 테두리는
// 글자와 동일한 색(사용자 확인, docs/edit-ui 목업 기준).
const STATUS_COLOR: Record<SecurityCaseStatus, string> = {
  접수: 'border-status-received bg-status-received-bg text-status-received',
  배정: 'border-status-assigned bg-status-assigned-bg text-status-assigned',
  경호중: 'border-status-active bg-status-active-bg text-status-active',
  경호완료: 'border-status-completed bg-status-completed-bg text-status-completed',
  종결: 'border-status-closed bg-status-closed-bg text-status-closed',
  취소: 'border-status-cancelled bg-status-cancelled-bg text-status-cancelled',
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
        // w-20: 상태마다 글자 수가 달라(접수 2자 ~ 경호완료 4자) 뱃지 길이가 들쭉날쭉하던 것을
        // 가장 긴 라벨(경호완료) 기준 고정폭+중앙정렬로 통일 (2026-09-11)
        'inline-flex h-6 w-20 items-center justify-center rounded-md border text-[11px] font-semibold',
        STATUS_COLOR[status],
        className,
      )}
    >
      <span className="text-trim">{status}</span>
    </span>
  )
}

export default StatusBadge
