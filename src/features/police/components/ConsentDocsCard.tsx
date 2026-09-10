import { FileText } from 'lucide-react'
import type { Worker } from '../../company/api/workers'
import type { SecurityCase } from '../types/securityCase'
import { downloadFileByPath } from '../../../shared/lib/download'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface ConsentDocsCardProps {
  securityCase: SecurityCase
  workers: Worker[]
}

// 목업(s5)의 보안서약 및 개인정보동의서 카드 — 등록된 근무자별 서약서 상태를 보여주고
// 업로드 완료된 건은 다운로드한다(경호계획서와 같은 /files/<path> 방식).
// 피전은 baseInfo.defaultWorkers가 비어(근무자 마스터 접근 불가, findings #6) 현재는
// 렌더되지 않는다 — 근무자 명단이 채워지면 동작(동의서 응답 shape는 데이터 생기면 재검증).
function ConsentDocsCard({ securityCase, workers }: ConsentDocsCardProps) {
  const showToast = useToastStore((state) => state.show)
  const roster = securityCase.baseInfo?.defaultWorkers ?? []
  if (roster.length === 0) return null

  async function handleDownload(path: string | undefined, fileName: string) {
    if (!path) return
    try {
      await downloadFileByPath(path, fileName)
    } catch {
      showToast('동의서를 불러오지 못했습니다', 'error')
    }
  }

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
          const filePath = securityCase.attachments?.workerConsentFilePaths?.[w.workerId]

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
              <button
                type="button"
                onClick={() => handleDownload(filePath, fileName)}
                disabled={!filePath}
                className="text-xs font-semibold text-green-700 disabled:opacity-50"
              >
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
