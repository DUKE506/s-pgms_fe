# DashBoard/Police/W/GetDashBoardGroupCount

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)·`SPoliceM3`(부산경찰청/지역청)·`SPoliceM5`(동래경찰서)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardGroupCount`
- 파라미터: 없음(기간 제외, groupSeq 미전달)
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제) — `SPoliceM1`(본청)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "groupSeq": 22, "parentSeq": null, "groupName": "본청", "depth": 0, "totalCount": 10,
      "children": [
        {
          "groupSeq": 24, "parentSeq": 22, "groupName": "부산경찰청", "depth": 1, "totalCount": 10,
          "children": [
            { "groupSeq": 32, "parentSeq": 24, "groupName": "동래경찰서", "depth": 2, "totalCount": 10, "children": [] },
            { "groupSeq": 33, "parentSeq": 24, "groupName": "서면경찰서", "depth": 2, "totalCount": 0, "children": [] }
          ]
        },
        {
          "groupSeq": 23, "parentSeq": 22, "groupName": "서울경찰청", "depth": 1, "totalCount": 0,
          "children": [
            { "groupSeq": 25, "parentSeq": 23, "groupName": "강남경찰서", "depth": 2, "totalCount": 0, "children": [] },
            { "groupSeq": 34, "parentSeq": 23, "groupName": "테테", "depth": 2, "totalCount": 0, "children": [] }
          ]
        }
      ]
    }
  ],
  "code": 200
}
```

## 응답 (실제) — `SPoliceM3`(부산경찰청, 지역청)

루트가 자기 지방청 노드(부산경찰청). depth 0부터 다시 시작.

```json
{ "data": [ { "groupSeq": 24, "parentSeq": null, "groupName": "부산경찰청", "depth": 0, "totalCount": 10,
  "children": [
    { "groupSeq": 32, "parentSeq": 24, "groupName": "동래경찰서", "depth": 1, "totalCount": 10, "children": [] },
    { "groupSeq": 33, "parentSeq": 24, "groupName": "서면경찰서", "depth": 1, "totalCount": 0, "children": [] }
  ] } ], "code": 200 }
```

## 응답 (실제) — `SPoliceM5`(동래경찰서)

자기 노드 한 줄만.

```json
{ "data": [ { "groupSeq": 32, "parentSeq": null, "groupName": "동래경찰서", "depth": 0, "totalCount": 10, "children": [] } ], "code": 200 }
```

## 특이사항

- **`Login/W/GetGroupTree`(`responses/Login-GetGroupTree.md`)와 응답 shape이 사실상 동일** —
  둘 다 역할 서브트리로 스코프되고, 노드마다 `groupSeq`/`groupName`/`children[]`을 준다. 차이는
  ① 필드명(`GetGroupTree`는 `parentGroupSeq`/`level`/`levelName`, 이건 `parentSeq`/`depth`) ②
  이 API만 `totalCount`를 더 준다는 것. **`totalCount:0`인 노드도 트리에서 안 빠지고 그대로
  나옴**(서울경찰청·강남경찰서·테테 등) — 즉 이 API 하나로 "조직 구조 + 건수"를 동시에 충분히
  구성할 수 있어 보임 → G2에서 `GetGroupTree` 별도 호출 필요성 재검토 대상.
- `totalCount`는 하위를 흡수한 롤업 값 확인(본청 10 = 부산청10+서울청0, 부산청10 = 동래10+서면0).
  형제(부산청 vs 서울청)는 안 겹침.
- groupSeq 파라미터 없이 호출해도 200(소속 이하 전체가 뿌리).
