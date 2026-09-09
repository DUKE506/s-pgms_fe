# Deploy/Police/W/GetDeployGuardSchedule

- 테스트 날짜: 2026-09-09
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래 피전)·`SPoliceM1`(본청)·`SPoliceM3`(부산청) /
  deployReqSeq 90(caseSeq 51, 경호중, 스케줄 생성됨)·91(접수)·70(배정, 스케줄 미생성)
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=`
- 프로브: `.claude/loop-backend/local/_probe-C-reply.sh` 후속 curl
- 배경: findings #6 — "경호 상세에서 근무 스케줄을 조회하는 API 누락"(2026-09-02 백엔드
  확인). 2026-09-03 스웨거에 EP는 생겼으나 `data: []`뿐. 2026-09-09 스케줄 생성 건으로
  재실측 → 실데이터 확인.

## 응답 (실제) — `deployReqSeq=90`(경호중), `SPoliceM5`

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "dates": "2026-09-07",
      "guardSchedule": [
        { "guardSeq": 13, "name": "김가드", "phone": "01012345687", "deptName": "안녕하세요~", "isWork": true },
        { "guardSeq": 14, "name": "이가드", "phone": "string", "deptName": "테스트부서", "isWork": true }
      ]
    },
    { "dates": "2026-09-08", "guardSchedule": [ /* 동일 2명 */ ] }
    /* … 배치기간 전 일자, 여기선 2026-09-07 ~ 2026-09-14+ */
  ],
  "code": 200
}
```

## 관찰

- **평면 배열** — `data`가 `{meta, data}` 이중 래핑이 아니라 바로 배열. `unwrapEnvelope`만.
- 일자별 `{ dates: "YYYY-MM-DD", guardSchedule: [...] }`. `guardSchedule` 항목:
  `guardSeq`(int) · `name` · `phone` · `deptName` · `isWork`(bool — 휴무 구분).
- **근무자 표시정보(`name`·`phone`·`deptName`)가 인라인** — findings #6 요청 1의 "ID만 주지
  말고 표시정보 embed" 충족. 피전은 근무자 마스터(`Guard/Stec/W/GetGuardList`) 접근 권한이
  없어 이 인라인 값이 필수였다.
- **근무 시각은 응답에 없음** — 프론트가 경호계획 근무시간(`GetDeployDetail`의
  `startTime`/`endTime`, 화면에선 `baseInfo.workHours` "HH:MM ~ HH:MM")을 모든 근무에
  공통 적용한다. 연장/단축으로 일자별 시간이 갈리는 경우는 배정 이후 재검증 대상.
- **스케줄 미생성** — `deployReqSeq=91`(접수)·`70`(배정, AutoAddSchedule 전) → `data: []`.
- **본청/지역청 토큰도 200** (deployReqSeq 90). 조회전용 뷰어도 근무일정 패널이 채워진다.

## 연동 (화면4 · #4)

- `police/api/securityCaseDetail.ts::getDeployGuardSchedule(id, workHours?)` 신설 —
  응답 → `WorkSchedule`(일자별 그룹 1개, 근무자별 assignment `isOff = !isWork`, 시각은
  `workHours` 스플릿). `workers: Worker[]`(id=`String(guardSeq)`, `name`·`phone` 인라인)도
  함께 반환해 `WorkerAssignmentPanel`이 workerId로 조인.
- `SecurityCaseDetailPage`의 `workers: never[] = []` 제거 → `useQuery`로 스케줄 조회,
  `securityCase.workSchedule`에 병합. `enabled = status !== '접수'`.
- 브라우저 검증(2026-09-09): SPoliceM5 `/security-cases/90` → 우측 "근무자 배정"에
  김가드·이가드 09:00~18:00·연락처 렌더. SPoliceM1(조회전용) 동일. 접수 건(91)은
  "아직 근무 일정이 등록되지 않았습니다" 유지. 콘솔 에러 0.

## 미해결 (findings #6 요청 3)

근무자별 보안서약·개인정보동의서 조회 전용 GET은 여전히 없음. `ConsentDocsCard`는
`baseInfo.defaultWorkers`가 빈 배열이라 지금도 per-근무자 렌더 없음 — 데이터/EP 생기면
별도 처리.
