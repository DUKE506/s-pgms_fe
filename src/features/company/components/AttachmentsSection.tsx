import { useRef } from 'react'
import { FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  setDestructionCertFile,
  setSecurityPlanFile,
  setWorkerConsentFile,
} from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { Worker } from '../api/workers'
import type { SecurityCase } from '../../police/types/securityCase'

interface UploadedFileRowProps {
  title: string
  fileName: string | null | undefined
  subtitle?: string
  onSelect: (file: File) => void
}

function UploadedFileRow({ title, fileName, subtitle, onSelect }: UploadedFileRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploaded = Boolean(fileName)

  return (
    <div
      className={
        uploaded
          ? 'flex items-center justify-between rounded-lg border border-dashed border-green-300 bg-green-50 p-4'
          : 'flex items-center justify-between rounded-lg border border-dashed border-border p-4'
      }
    >
      <div className="flex items-center gap-3">
        <FileText className={uploaded ? 'size-5 text-green-700' : 'size-5 text-muted-foreground'} />
        <div>
          <div className="text-sm font-semibold text-foreground">{uploaded ? fileName : title}</div>
          {uploaded && subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={uploaded ? 'text-xs font-semibold text-green-700' : 'text-xs font-semibold text-primary'}
      >
        {uploaded ? '재업로드' : '업로드'}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

interface AttachmentsSectionProps {
  securityCase: SecurityCase
  workers: Worker[]
}

function AttachmentsSection({ securityCase, workers }: AttachmentsSectionProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const roster = securityCase.baseInfo?.defaultWorkers ?? []

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
  }

  const securityPlanMutation = useMutation({
    mutationFn: (fileName: string) => setSecurityPlanFile(securityCase.id, fileName),
    onSuccess: () => {
      invalidate()
      showToast('경호계획서가 업로드되었습니다', 'success')
    },
    onError: () => showToast('업로드에 실패했습니다', 'error'),
  })

  const destructionCertMutation = useMutation({
    mutationFn: (fileName: string) => setDestructionCertFile(securityCase.id, fileName),
    onSuccess: () => {
      invalidate()
      showToast('파기확인서가 업로드되었습니다', 'success')
    },
    onError: () => showToast('업로드에 실패했습니다', 'error'),
  })

  const consentMutation = useMutation({
    mutationFn: ({ workerId, fileName }: { workerId: string; fileName: string }) =>
      setWorkerConsentFile(securityCase.id, workerId, fileName),
    onSuccess: () => {
      invalidate()
      showToast('개인정보동의서가 업로드되었습니다', 'success')
    },
    onError: () => showToast('업로드에 실패했습니다', 'error'),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 text-sm font-bold text-foreground">경호계획서</div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">
          단순 첨부파일로 관리됩니다 (사전미팅 결과물)
        </p>
        <UploadedFileRow
          title="경호계획서 파일을 업로드하세요"
          fileName={securityCase.attachments?.securityPlanFileName}
          onSelect={(file) => securityPlanMutation.mutate(file.name)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 text-sm font-bold text-foreground">보안서약 및 개인정보동의서</div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">
          등록된 경호원별로 개인정보동의서를 업로드합니다. 경호원 변경 시 추가 등록, 종결 전까지
          재업로드 가능
        </p>
        <div className="flex flex-col gap-2.5">
          {roster.length === 0 && (
            <p className="text-xs text-muted-foreground">기본정보에 등록된 근무자가 없습니다</p>
          )}
          {roster.map((w) => {
            const worker = workers.find((x) => x.id === w.workerId)
            const fileName = securityCase.attachments?.workerConsentFileNames[w.workerId]
            return (
              <UploadedFileRow
                key={w.workerId}
                title={worker?.name ?? w.workerId}
                fileName={fileName}
                subtitle={worker?.name}
                onSelect={(file) =>
                  consentMutation.mutate({ workerId: w.workerId, fileName: file.name })
                }
              />
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">배치요구서</div>
        </div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">피전이 작성한 원본 문서입니다</p>
        <div className="flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-blue-700" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                배치요구서_{securityCase.securityCode ?? securityCase.receiptNumber}.pdf
              </div>
              <div className="text-[11px] text-muted-foreground">
                등록일 · {securityCase.createdAt.slice(0, 10)}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-700">보기</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 text-sm font-bold text-foreground">파기확인서 등록</div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">
          본부관리자가 등록 · 피전이 다운로드해야 종결 처리 가능
        </p>
        <UploadedFileRow
          title="파기확인서 파일을 업로드하세요"
          fileName={securityCase.attachments?.destructionCertFileName}
          onSelect={(file) => destructionCertMutation.mutate(file.name)}
        />
      </div>
    </div>
  )
}

export default AttachmentsSection
