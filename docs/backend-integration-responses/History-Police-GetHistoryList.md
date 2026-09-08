# History/Police/W/GetHistoryList

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서, groupSeq 32), `SPoliceM3`(부산경찰청),
  `SPoliceM1`(본청) / 동래경찰서 경호취소 건 caseSeq 46~50
- 엔드포인트: `GET /api/v1/History/Police/W/GetHistoryList`
- 프로브: `.claude/loop-backend/_probe-14.sh`

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
