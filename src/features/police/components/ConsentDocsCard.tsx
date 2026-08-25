import { FileText } from 'lucide-react'
import type { Worker } from '../../company/api/workers'
import type { SecurityCase } from '../types/securityCase'

interface ConsentDocsCardProps {
  securityCase: SecurityCase
  workers: Worker[]
}

// 목업(s5)의 보안서약 및 개인정보동의서 카드 — 등록된 근무자별 서약서 업로드
// 상태만 읽기전용으로 보여준다. 실제 파일이 없어 다운로드는 비활성 라벨.
function ConsentDocsCard({ securityCase, workers }: ConsentDocsCardProps) {
  const roster = securityCase.baseInfo?.defaultWorkers ?? []
  if (roster.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-1 text-sm font-bold text-foreground">보안서약 및 개인정보동의서</div>
      <p className="mb-3.5 text-[11px] text-muted-foreground">
        등록된 근무자별 서약서입니다. 업로드 완료된 건만 다운로드할 수 있습니다.
      </p>
      <div className="flex flex-col gap-2.5">
        {roster.map((w) => {
          const worker = workers.find((x) => x.id === w.workerId)
          const name = worker?.name ?? w.workerId
          const fileName = securityCase.attachments?.workerConsentFileNames[w.workerId]

          if (!fileName) {
            return (
              <div
                key={w.workerId}
                className="flex items-center justify-between rounded-lg border border-dashed border-border p-3.5 opacity-70"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{name}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">미등록</span>
              </div>
            )
          }

          return (
            <div
              key={w.workerId}
              className="flex items-center justify-between rounded-lg border border-dashed border-green-300 bg-green-50 p-3.5"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="size-4.5 text-green-700" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{name}</div>
                  <div className="text-[11px] text-muted-foreground">{fileName} · 업로드 완료</div>
                </div>
              </div>
              <button type="button" onClick={() => {}} className="text-xs font-semibold text-green-700">
                다운로드
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ConsentDocsCard
