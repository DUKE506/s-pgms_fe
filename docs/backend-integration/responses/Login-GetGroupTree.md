# Login/W/GetGroupTree

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청, groupSeq 22), `SPoliceM3`(부산경찰청 =
  지방청관리자, groupSeq 24), `SPoliceM5`(동래경찰서 = 피전, groupSeq 32)
- 엔드포인트: `GET /api/v1/Login/W/GetGroupTree`
- 파라미터: 없음 (토큰만)
- 프로브: `.claude/loop-backend/local/_probe-15b.sh`

## 응답 (실제) — `SPoliceM1`(본청)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "groupSeq": 22, "groupName": "본청", "level": 1, "levelName": "본청",
      "parentGroupSeq": null,
      "children": [
        {
          "groupSeq": 24, "groupName": "부산경찰청", "level": 2, "levelName": "지방청",
          "parentGroupSeq": 22,
          "children": [
            { "groupSeq": 32, "groupName": "동래경찰서", "level": 3, "levelName": "경찰서", "parentGroupSeq": 24, "children": [] },
            { "groupSeq": 33, "groupName": "서면경찰서", "level": 3, "levelName": "경찰서", "parentGroupSeq": 24, "children": [] }
          ]
        },
        {
          "groupSeq": 23, "groupName": "서울경찰청", "level": 2, "levelName": "지방청",
          "parentGroupSeq": 22,
          "children": [
            { "groupSeq": 25, "groupName": "강남경찰서", "level": 3, "levelName": "경찰서", "parentGroupSeq": 23, "children": [] },
            { "groupSeq": 34, "groupName": "테테", "level": 3, "levelName": "경찰서", "parentGroupSeq": 23, "children": [] }
          ]
        }
      ]
    }
  ],
  "code": 200
}
```

## 응답 (실제) — `SPoliceM3`(부산경찰청, 지방청)

루트가 자기 지방청 노드. 산하 경찰서(동래 32·서면 33)만 children.

```json
{ "data": [ { "groupSeq": 24, "groupName": "부산경찰청", "level": 2, "levelName": "지방청",
  "parentGroupSeq": 22, "children": [
    { "groupSeq": 32, "groupName": "동래경찰서", "level": 3, "levelName": "경찰서", "parentGroupSeq": 24, "children": [] },
    { "groupSeq": 33, "groupName": "서면경찰서", "level": 3, "levelName": "경찰서", "parentGroupSeq": 24, "children": [] }
  ] } ], "code": 200 }
```

## 응답 (실제) — `SPoliceM5`(동래경찰서, 피전)

자기 노드만. children 없음.

```json
{ "data": [ { "groupSeq": 32, "groupName": "동래경찰서", "level": 3, "levelName": "경찰서",
  "parentGroupSeq": 24, "children": [] } ], "code": 200 }
```

## 특이사항

- **역할 서브트리로 스코프됨** — 본청 토큰은 전국 트리, 지방청 토큰은 자기 지방청+산하
  경찰서, 경찰서 토큰은 자기 노드만. 별도 파라미터 없이 토큰만으로 결정.
- 노드 필드: `groupSeq`, `groupName`, `level`(1 본청 / 2 지방청 / 3 경찰서), `levelName`,
  `parentGroupSeq`, `children[]`(재귀).
- `Group/Stec/W/GetGroupTree`는 본청 토큰에 **403**(본사 태그) — 이 `Login/W/GetGroupTree`가
  경찰 3역할이 공통으로 쓸 수 있는 유일한 트리 EP.
- **용도**: `GetHistoryList`·`GetDeployList`가 경찰서(leaf) `groupSeq` 단위로만 조회되고
  부모 노드로는 캐스케이드가 안 되므로(둘 다 실측), 본청/지역청이 관할 전체를 보려면 이
  트리에서 leaf `groupSeq` 목록을 뽑아 경찰서마다 호출해 합쳐야 한다. → #15 결정:
  이 클라 팬아웃은 임시방편이라 채택하지 않고 백엔드에 부모 groupSeq 캐스케이드를 요청
  (`docs/backend-integration/requests/2026-09-08-이력-C.md`).
