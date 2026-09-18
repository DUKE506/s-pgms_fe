import { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import LoadingOverlay from '@/shared/components/LoadingOverlay'
import {
  downloadDestructionCert,
  uploadDestructionCertDoc,
  uploadSecurityPlanDoc,
  uploadWorkerConsentDoc,
} from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import { downloadFileByPath } from '../../../shared/lib/download'
import DispatchRequestViewDialog from './DispatchRequestViewDialog'
import type { Worker } from '../api/workers'
import type { SecurityCase } from '../../police/types/securityCase'

interface UploadedFileRowProps {
  title: string
  fileName: string | null | undefined
  subtitle?: string
  onSelect: (file: File) => void
  // 상태 등으로 업로드가 불가한 경우(예: 파기확인서는 경호중·경호완료에서만).
  disabled?: boolean
  disabledHint?: string
  onDownload?: () => void
}

function UploadedFileRow({
  title,
  fileName,
  subtitle,
  onSelect,
  disabled,
  disabledHint,
  onDownload,
}: UploadedFileRowProps) {
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
      <div className="flex min-w-0 items-center gap-3">
        <FileText className={uploaded ? 'size-5 shrink-0 text-green-700' : 'size-5 shrink-0 text-muted-foreground'} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{uploaded ? fileName : title}</div>
          {uploaded && subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
          {!uploaded && disabled && disabledHint && (
            <div className="truncate text-[11px] text-muted-foreground">{disabledHint}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {uploaded && onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-green-700"
          >
            <Download className="size-3.5" />
            다운로드
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={
            disabled
              ? 'whitespace-nowrap text-xs font-semibold text-muted-foreground'
              : uploaded
                ? 'whitespace-nowrap text-xs font-semibold text-green-700'
                : 'whitespace-nowrap text-xs font-semibold text-primary'
          }
        >
          {uploaded ? '재업로드' : '업로드'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
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
  const [dispatchViewOpen, setDispatchViewOpen] = useState(false)

  // 파기확인서는 경호중·경호완료 상태에서만 등록 가능(그 외 서버 409).
  const destructionUploadable =
    securityCase.status === '경호중' || securityCase.status === '경호완료'

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
  }

  function toastError(error: unknown) {
    showToast(error instanceof Error ? error.message : '업로드에 실패했습니다', 'error')
  }

  // 경호계획서·동의서는 filePath를 /files/<path>로 직접 받는다(전용 API 없음).
  async function downloadByPath(
    path: string | null | undefined,
    fileName: string | null | undefined,
  ) {
    if (!path) return
    try {
      await downloadFileByPath(path, fileName)
    } catch {
      showToast('파일을 불러오지 못했습니다', 'error')
    }
  }

  const securityPlanMutation = useMutation({
    mutationFn: (file: File) => uploadSecurityPlanDoc(securityCase.id, file),
    onSuccess: () => {
      invalidate()
      showToast('경호계획서가 업로드되었습니다', 'success')
    },
    onError: toastError,
  })

  const destructionCertMutation = useMutation({
    mutationFn: (file: File) => uploadDestructionCertDoc(securityCase.id, file),
    onSuccess: () => {
      invalidate()
      showToast('파기확인서가 업로드되었습니다', 'success')
    },
    onError: toastError,
  })

  const consentMutation = useMutation({
    mutationFn: ({ workerId, file }: { workerId: string; file: File }) =>
      uploadWorkerConsentDoc(securityCase.id, workerId, file),
    onSuccess: () => {
      invalidate()
      showToast('개인정보동의서가 업로드되었습니다', 'success')
    },
    onError: toastError,
  })

  const destructionDownloadMutation = useMutation({
    mutationFn: () => downloadDestructionCert(securityCase.id),
    onError: () => showToast('파기확인서를 불러오지 못했습니다', 'error'),
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
          onSelect={(file) => securityPlanMutation.mutate(file)}
          onDownload={
            securityCase.attachments?.securityPlanFilePath
              ? () =>
                  downloadByPath(
                    securityCase.attachments?.securityPlanFilePath,
                    securityCase.attachments?.securityPlanFileName,
                  )
              : undefined
          }
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
            <p className="text-xs text-muted-foreground">경호계획서 정보에 등록된 근무자가 없습니다</p>
          )}
          {roster.map((w) => {
            const worker = workers.find((x) => x.id === w.workerId)
            const fileName = securityCase.attachments?.workerConsentFileNames[w.workerId]
            const filePath = securityCase.attachments?.workerConsentFilePaths?.[w.workerId]
            return (
              <UploadedFileRow
                key={w.workerId}
                title={worker?.name ?? w.workerId}
                fileName={fileName}
                subtitle={worker?.name}
                onSelect={(file) => consentMutation.mutate({ workerId: w.workerId, file })}
                onDownload={filePath ? () => downloadByPath(filePath, fileName) : undefined}
              />
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">배치요구서</div>
        </div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">
          피전이 신규 접수 시 작성한 내용입니다
        </p>
        <div className="flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-blue-700" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                {securityCase.receiptNumber} 배치요구서
              </div>
              <div className="text-[11px] text-muted-foreground">
                등록일 · {securityCase.createdAt.slice(0, 10)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDispatchViewOpen(true)}
            className="text-xs font-semibold text-blue-700"
          >
            보기
          </button>
        </div>
      </div>

      <DispatchRequestViewDialog
        securityCase={securityCase}
        open={dispatchViewOpen}
        onOpenChange={setDispatchViewOpen}
      />

      <div className="rounded-xl border border-border bg-card p-5.5">
        <div className="mb-1 text-sm font-bold text-foreground">파기확인서 등록</div>
        <p className="mb-3.5 text-[11px] text-muted-foreground">
          본부관리자가 등록 · 피전이 다운로드해야 종결 처리 가능
        </p>
        <UploadedFileRow
          title="파기확인서 파일을 업로드하세요"
          fileName={securityCase.attachments?.destructionCertFileName}
          onSelect={(file) => destructionCertMutation.mutate(file)}
          disabled={!destructionUploadable}
          disabledHint="경호중·경호완료 상태에서만 등록할 수 있습니다"
          onDownload={
            securityCase.attachments?.destructionCertFileName
              ? () => destructionDownloadMutation.mutate()
              : undefined
          }
        />
      </div>

      <LoadingOverlay
        show={
          securityPlanMutation.isPending ||
          destructionCertMutation.isPending ||
          consentMutation.isPending
        }
        variant="업로드"
      />
      <LoadingOverlay show={destructionDownloadMutation.isPending} variant="다운로드" />
    </div>
  )
}

export default AttachmentsSection
