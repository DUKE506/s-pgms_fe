import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { SecurityCase } from '../../police/types/securityCase'

interface DispatchRequestViewDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || '-'}</div>
    </div>
  )
}

// 배치요구서는 별도 PDF가 아니라 경찰서에서 신규 접수(SecurityCaseNewPage) 시
// 작성한 폼 내용 그 자체라, 여기서도 그 필드를 그대로 읽기전용으로 보여준다
// (2026-08-24 결정).
function DispatchRequestViewDialog({ securityCase, open, onOpenChange }: DispatchRequestViewDialogProps) {
  const { subject, location, policeContact } = securityCase

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>배치요구서</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {securityCase.policeStation} · 접수 {securityCase.createdAt.slice(0, 10)}
          </p>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold text-foreground">1. 경호대상자 정보</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="성명 (성만 표기)" value={subject.nameInitial} />
              <Field label="성별" value={subject.gender} />
              <Field label="출생년도" value={subject.birthYear} />
              <Field label="나이(만)" value={subject.age} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="직업" value={subject.occupation} />
              <Field label="거주지" value={subject.residence} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Field label="2. 사건유형" value={securityCase.caseType} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Field label="3. 사건개요" value={securityCase.caseSummary} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="text-xs font-bold text-foreground">4. 배치기간</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작일" value={securityCase.startDate} />
              <Field label="종료일" value={securityCase.endDate} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="text-xs font-bold text-foreground">5. 배치장소</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="주거지" value={location.residence} />
              <Field label="직장지" value={location.workplace} />
              <Field label="기타1" value={location.etc1} />
              <Field label="기타2" value={location.etc2} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Field label="6. 기타참고사항" value={securityCase.additionalNotes} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="text-xs font-bold text-foreground">7. 경찰서 수사관정보</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="피해자전담경찰관" value={policeContact.victimOfficer} />
              <Field label="수사관" value={policeContact.investigator} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="text-xs font-bold text-foreground">8. 작성 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="배치요구서 작성일" value={securityCase.createdAt.slice(0, 10)} />
              <Field label="요구자" value={securityCase.requester} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DispatchRequestViewDialog
