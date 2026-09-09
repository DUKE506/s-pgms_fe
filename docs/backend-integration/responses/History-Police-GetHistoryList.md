# History/Police/W/GetHistoryList

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서, groupSeq 32), `SPoliceM3`(부산경찰청),
  `SPoliceM1`(본청) / 동래경찰서 경호취소 건 caseSeq 46~50
- 엔드포인트: `GET /api/v1/History/Police/W/GetHistoryList`
- 프로브: `.claude/loop-backend/local/_probe-14.sh`

## 파라미터 (스웨거)

`pageNumber`(기본 1) · `pageSize`(기본 10) · `status`(int) · `startDate`(date) · `endDate`(date) ·
`groupSeq`(int) · `searchKey`(string) · `endReason`(string)

## 응답 (실제) — `SPoliceM5`, `?groupSeq=32&pageSize=100`

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "meta": { "pageNumber": 1, "pageSize": 100, "totalCount": 5, "totalPages": 1 },
    "data": [
      {
        "caseSeq": 50,
        "mgmtNo": "26-09-동래경찰서 ST0006",
        "groupName": "동래경찰서",
        "parentGroupName": "부산경찰청",
        "startDt": null,
        "endDt": null,
        "totalMin": null,
        "statusName": "경호취소",
        "remark": "취소 테스트"
      },
      {
        "caseSeq": 46,
        "mgmtNo": "26-09-동래경찰서 ST0002",
        "groupName": "동래경찰서",
        "parentGroupName": "부산경찰청",
        "startDt": null,
        "endDt": null,
        "totalMin": null,
        "statusName": "경호취소",
        "remark": "ㅍ"
      }
    ]
  },
  "code": 200
}
```

## 관찰

- **`groupSeq` 필수**: 파라미터 없이 부르면 `SPoliceM5`·`SPoliceM3`·`SPoliceM1` **전부 totalCount 0**.
  `?groupSeq=32`(동래) 넣으면 세 역할 모두 취소 5건 반환 — 서버가 역할로 스코프를 걸지 않고
  `groupSeq`가 준 노드만 조회한다(`Deploy/Police/W/GetDeployList`와 동형). `groupSeq`는 로그인 시
  `GetMyProfile`로 받아 세션(`useAuthStore.user.groupSeq`)에 저장돼 있다(동래=32).
- **끝난 건만**(HIST-001): 반환된 5건 전부 `statusName:"경호취소"`. 진행중(배정·경호중·경호완료)은
  안 나온다 → 본청/지역청이 진행중 건을 보려면 별도 API 필요(#15).
- **응답 shape**: `{message, data:{meta, data:[...]}, code}` — `GetGuardCaseList`(#8)와 같은 이중
  래핑. `unwrapEnvelope` + `.data`, `meta.totalPages` 순회.
- 행 필드: `caseSeq, mgmtNo(완성형), groupName(경찰서), parentGroupName(지역청), startDt, endDt,
  totalMin(총근무 분), statusName, remark`. 취소 건은 `startDt`/`endDt`/`totalMin` 전부 `null`
  (배정 전 취소). `statusName:"경호취소"` → 프론트 라벨 `'취소'` 매핑 필요.
- **파라미터 동작**(`SPoliceM5`, groupSeq 32 고정): `status=4` → 5건, `status=5` → 0건
  (종결 데이터 없어 코드 미확정). `searchKey=ST0002` → 1건(경호코드 부분일치 정상 동작).
  `startDate=2026-01-01&endDate=2026-12-31` → 2건(`startDt` 값 있는 건만). `endReason=X` → 0건.
  → 목록량 작아 화면의 기존 클라이언트 필터로 충분(exclusions).
- **지역청/본청 스코프**: `SPoliceM3`(부산청, groupSeq 24)·`SPoliceM1`(본청, groupSeq 22)를
  파라미터 없이 부르면 0건. 부모 `groupSeq` 캐스케이드(관할 이하 전체) 여부는 미검증 → #15.

## #15 관찰 (2026-09-08, `_probe-15.sh`·`_probe-15b.sh`)

본청(`SPoliceM1`)/지역청(`SPoliceM3`) 토큰으로 재실측:

- **캐스케이드 없음**: `groupSeq` 없음 / 부모 노드(본청 22·부산청 24) → 전부 **0건**.
  `groupSeq=32`(동래 = leaf 경찰서) 넣어야 취소 5건. 즉 `GetHistoryList`는 **경찰서
  단위로만** 조회되고 지방청·본청 노드로 관할 전체를 한 번에 못 받는다.
- **역할 스코프는 서버가 검다(부분)**: 경찰서 토큰(`SPoliceM5`)은 자기 `groupSeq`만
  허용(다른 경찰서 groupSeq → 403, `GetDeployList` 문서 참고). 본청/지역청 토큰은 자기
  서브트리 하위 경찰서 groupSeq면 200. → leaf 단위 팬아웃은 스코프 안전.
- **진행중 나오는 모드 없음**: `status=0~3`, `includeActive=true`, `all=true`, `isEnd=false`
  전부 무시 — 항상 종결·취소만. 본청/지역청 이력 화면은 진행중 건도 보여야 하는데
  (2026-08-27 결정 · #15에서도 "유지") `GetHistoryList` 하나로는 불가.
- **진행중 목록**: `Deploy/Police/W/GetDeployList?groupSeq=<leaf>`가 본청/지역청 토큰에도
  200(배정/경호중/경호완료 반환). 이력 화면의 "진행중" 부분은 이걸로 채워야 한다.
- **상세 스코프 미검**: `GetHistoryDetail?caseSeq=46`(동래 취소건) → `SPoliceM1`·`SPoliceM3`
  둘 다 200. 타 관할 차단 로직 없음(#14와 동일). 응답에 `guardWorkLoc`/`guardHomeLoc`
  포함(#14 exclusions "배치장소 없음"과 배치 — 재확인 필요, #15 이월 메모).
- → #15는 **부분완료(△)**, 본청/지역청 이력은 mock 유지. 백엔드 요청:
  `docs/backend-integration/requests/2026-09-08-이력-C.md` (issues #14·#15).

## 회신 반영 (2026-09-09, `_probe-C-reply.sh`·`_probe-C-reply-b.sh`) — issues #15 해소

백엔드가 스웨거 개정(2026-09-09). 재실측:

- **역할 캐스케이드 동작** — `groupSeq` **안 보내면** 서버가 토큰 역할대로 스코프:
  - 본청(`SPoliceM1`) 파라미터 없음 → **전국 전 구간 9건**(접수1/배정1/경호중1/경호완료1/취소5,
    강남(서울청)+동래(부산청) 섞여서 반환).
  - 지역청(`SPoliceM3`) 파라미터 없음 → **관할 이하 전체 7건**(동래만, 강남 제외).
  - 피전(`SPoliceM5`) 파라미터 없음 → **자기 경찰서 끝난 건만 5건**(접수·진행중 안 옴).
- `groupSeq`는 **leaf 경찰서 필터**로만 동작 — 부모 노드(본청 22·부산청 24) → 0건,
  권한 밖 groupSeq → 0건(403 아님).
- **pageSize 상한 100** — `pageSize=101` 이상 → HTTP 400 "잘못된 요청입니다".
- **행 필드 신규**: `deploySeq`, `status`(int — 접수 `null`·배정 `0`·경호중 `1`·경호완료
  `2`·종결 `3`·경호취소 `4`). 접수 행은 `caseSeq: null`·`mgmtNo: "…경찰서 접수"`(경호코드
  자리 "접수")·`startDt`/`endDt` = 배치기간. **종결·취소만 `deploySeq: null`**, 나머지는
  전부 `deploySeq` 있음.
- **연동**: `police/api/history.ts` — 본청/지역청은 `listSecurityCaseHistory`가 groupSeq
  없이 호출(서버 role 스코프), 경찰서(#14)는 세션 groupSeq 유지(회귀 0). `SecurityCase.id`는
  종결·취소면 `caseSeq`(→이력 상세), 진행중·접수면 `deploySeq`(→경호 상세). `HistoryListPage`
  `historyTarget()`이 상태로 라우팅.

### 실패 예 (초기 프로브 오진 주의)
`pageSize=200`으로 부르면 400이 떠서 "groupSeq 필수"로 착각할 수 있음 — 실제로는
pageSize 상한(100) 초과 때문. `pageSize=100` 이하면 파라미터 없이도 200.
