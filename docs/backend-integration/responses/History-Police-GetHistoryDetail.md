# History/Police/W/GetHistoryDetail

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서), `SPoliceM3`(부산경찰청), `SPoliceM1`(본청) /
  경호취소 건 caseSeq 46
- 엔드포인트: `GET /api/v1/History/Police/W/GetHistoryDetail?caseSeq=`
- 프로브: `.claude/loop-backend/local/_probe-14.sh`

## 응답 (실제) — `caseSeq=46`, `SPoliceM5`

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseSeq": 46,
    "mgmtNo": "26-09-동래경찰서 ST0002",
    "statusName": "경호취소",
    "suspectUserName": "홍**",
    "startDate": "2026-09-10T09:00:00",
    "endDate": "2026-09-30T18:00:00",
    "totalGuardWorkMinutes": null,
    "investigator": null,
    "responsibleOfficer": null,
    "guardWorkLoc": "부산 동래구 온천동 200",
    "guardHomeLoc": "부산 동래구 낙민동 100 (수정됨)",
    "endDt": "2026-09-07T05:08:03",
    "remark": "ㅍ",
    "guards": [
      { "guardSeq": 13, "guardName": "김가드", "workDays": 13, "totalMinutes": 6720 },
      { "guardSeq": 15, "guardName": "박가드", "workDays": 1, "totalMinutes": 540 },
      { "guardSeq": 14, "guardName": "이가드", "workDays": 1, "totalMinutes": 540 },
      { "guardSeq": 16, "guardName": "최가드", "workDays": 1, "totalMinutes": 490 }
    ]
  },
  "code": 200
}
```

## 관찰

- **스코프 미적용**: `caseSeq=46`(동래 건)을 `SPoliceM5`(동래)·`SPoliceM3`(부산청)·`SPoliceM1`(본청)
  으로 부르면 **셋 다 HTTP 200 · 동일 응답**. 본사(Stec) 토큰만 403(issues #14). 남의 관할 건에
  대한 차단은 확인 안 됨(현재 데이터가 동래 건뿐).
- 필드 → 화면 매핑:
  - `mgmtNo` → 헤더 관리번호, `statusName`("경호취소"→'취소') → 상태 배지.
  - `suspectUserName` → 대상자명. **이미 마스킹**("홍**")돼서 온다(프론트는 `nameInitial`로 취급).
  - `startDate`/`endDate` → 경호시작·종료(ISO datetime, 날짜만 표시). 취소 건도 값이 있음(목록의
    `startDt` `null`과 다름 — 상세는 배치요구서 기간을 주는 듯).
  - `totalGuardWorkMinutes`(총근무 분) → 총경호시간. 취소 건은 `null` → "-".
  - `responsibleOfficer`(담당 경찰관) → "경찰관 정보". `investigator`(수사관)는 화면 미표시.
  - `endDt`(취소·종결 처리 시각) → 취소일 / 종결일.
  - `remark` → 취소사유(문장) / 종결사유(코드). 여기선 취소라 자유문자.
  - `guards[]`(근무자별 이름·근무일수·근무분) → "근무자 배정 이력" 표. **이름이 인라인**이라
    근무자 명단 별도 조회 불필요.
  - `guardWorkLoc`/`guardHomeLoc`(배치장소) → **미사용** (경찰 이력 상세는 배치장소를 안 보여줌 —
    피해자 개인정보, 2026-08-27 결정).
- **응답에 없는 것**: `caseType`(사건유형), 5개 조치(안전/긴급응급/잠정/긴급임시/임시조치 +
  적용기간). 화면엔 칸이 있으나 → "-". 취소 건은 원래 없던 값이라 무관, 종결 건은 갭 → exclusions,
  종결 데이터 생기면 재확인(필요 시 issues).
- `data`가 `{meta, data}` 이중 래핑이 아니라 객체 하나(`unwrapEnvelope`만 하면 됨).

## 회신 반영 (2026-09-09, `_probe-C-reply.sh`)

- ⚠️ **스웨거↔실제 불일치(제외 처리)**: 스웨거 개정 설명은 "경찰용은 **여전히 종결·경호취소만
  열린다**"인데, 실측은 `caseSeq=51`(경호중)을 `SPoliceM5`·`SPoliceM1` 둘 다 **HTTP 200**(전체
  데이터 반환) — 진행중 건도 열린다. 화면은 진행중 건을 `/security-cases/:id`(경호상세
  조회전용)로 라우팅해 이 EP엔 종결·취소 `caseSeq`만 도달하므로 **영향 없음**. findings에
  "스웨거 부정확(구현이 더 관대)" 기록.
- 본청/지역청 상세 스코프(타 관할 `caseSeq` 차단) 여부는 데이터가 동래 건뿐이라 여전히
  미검 → CARRYOVER "URL 직접 접근 스코프 일괄 테스트"로 이관(사용자 결정).
- Police 상세 응답엔 `groupName`/`parentGroupName` 없음(본사용 `History/Stec/W/GetHistoryDetail`
  에만 붙음 — `History-Stec-GetHistoryDetail.md` 참고).
