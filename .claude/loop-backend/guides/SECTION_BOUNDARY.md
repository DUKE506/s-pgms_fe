# SECTION_BOUNDARY — 섹션 종료 절차

`LOOP_INSTRUCTIONS.md` 10단계. 이번 iteration이 **섹션의 마지막 화면**이면 실행.

## 섹션 정의

**섹션 = 한 역할의 한 기능 영역**, 대체로 그룹 경계와 일치(그룹 C 이력 = 한 섹션).
예외 — **그룹 B는 두 섹션으로 분할**(2026-09-04, 쌓인 요청분이 너무 커지지 않게):
B-1 = #6~#9, B-2 = #10~#12. 분할 여부·경계는 `PROGRESS.md`에서 확인.

## 절차

### 1. 항목 수집

`docs/backend-integration/findings.md`에서 **이번 섹션에서 나온** 항목 중:

- **포함**: 종류 = 요청 / 블로커 / 질문 이고 상태가 🔴(검토 전) 또는 🟡(요청함, 이전
  섹션에서 미회신). 즉 "백엔드가 응답해야 하는 것".
- **제외**: 🟢(해결), 종류 = 제외. "데이터 없어 재검증 예정"인 항목(→ `CARRYOVER.md` 소관).

### 2. 요청서 `.md` 작성

`docs/backend-integration/requests/YYYY-MM-DD-<섹션>.md`:

```markdown
# 백엔드 요청·논의 — 섹션 <X> (<이름>)

> 작성일 · 대상 섹션(#NN~#NN) · 상태(전달 예정) · 근거 findings #N

**연동 완료분(요청 제외)**: <이미 붙은 EP 목록>

유형: 요청(백엔드 구현) / 논의(설계·스코프 확인) / 질문(몰라서 묻는 것)

| 화면 | 기능 | 지금 상태 | 필요한 것 | 유형 | 근거 |
|---|---|---|---|---|---|
| ... | ... | ... | ... | 요청/논의/질문 | #N |

---
재확인(요청 아님, 데이터 없어 재검증 예정): <CARRYOVER 항목 요약>
```

### 3. 요청서 `.xlsx` 동반본

`openpyxl`로 `.md`와 같은 내용을 뽑는다(B-2·C·D 요청서와 동일 형식). 뼈대:

```python
import openpyxl
from openpyxl.styles import Font, Alignment
wb = openpyxl.Workbook(); ws = wb.active
ws.title = "백엔드 요청 <X> (<이름>)"
ws.cell(1, 1, "백엔드 요청·논의 — 섹션 <X> …  ·  <날짜>  ·  근거: <경로>").font = Font(bold=True, size=10)
for c, h in enumerate(["화면","기능","지금 상태","필요한 것","유형","근거"], 1):
    cell = ws.cell(2, c, h); cell.font = Font(bold=True)
    cell.alignment = Alignment(wrap_text=True, vertical="center")
# 데이터 행: Alignment(wrap_text=True, vertical="top")
# 이어서 빈 행 + "재확인(요청 아님 …):" 섹션 라인들
for col, w in {"A":22,"B":20,"C":66,"D":66,"E":10,"F":14}.items():
    ws.column_dimensions[col].width = w
ws.freeze_panes = "A3"
wb.save("docs/backend-integration/requests/YYYY-MM-DD-<섹션>.xlsx")
```

### 4. 전달 + 상태 갱신

- `.md` + `.xlsx`를 사용자에게 제시("전달 준비 완료").
- 포함한 `findings.md` 항목 상태를 🔴 → 🟡(요청함)으로.
- `PROGRESS.md` 해당 섹션 마지막 행 비고에 요청서 경로 기록.

### 5. 응답은 기다리지 않는다

바로 다음 섹션 진행. 나중에 백엔드가 완료 통보를 하면 **회신반영 iteration**
(`LOOP_INSTRUCTIONS.md` 0단계 유형 = 회신반영)으로 처리 — 다음 화면 착수 전에 끼워 넣는다.
