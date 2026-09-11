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
        // w-20: 상태마다 글자 수가 달라(접수 2자 ~ 경호완료 4자) 뱃지 길이가 들쭉날쭉하던 것을
        // 가장 긴 라벨(경호완료) 기준 고정폭+중앙정렬로 통일 (2026-09-11)
        'inline-flex h-6 w-20 items-center justify-center rounded-md text-[11px] font-semibold text-white',
        STATUS_COLOR[status],
        className,
      )}
    >
      <span className="text-trim">{status}</span>
    </span>
  )
}

export default StatusBadge
