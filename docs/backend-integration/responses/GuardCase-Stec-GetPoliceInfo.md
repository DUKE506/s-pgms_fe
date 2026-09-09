# GuardCase/Stec/W/GetPoliceInfo

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(본사, 운영관리자)
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetPoliceInfo`

2026-09-04 스웨거에 신설. 지방청(2계층) → 경찰서(3계층) 2단 트리. 목록 화면의
지역청·경찰서 필터 옵션을 채우는 용도 (섹션 B-1 요청서 요청 9 = issues #1 관련).

## 요청

```
GET /api/v1/GuardCase/Stec/W/GetPoliceInfo
Authorization: Bearer {StecM1 accessToken}
```

## 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "groupSeq": 23,
      "groupName": "서울경찰청",
      "childPoliceInfo": [
        { "childGroupSeq": 25, "childGroupName": "강남경찰서" },
        { "childGroupSeq": 34, "childGroupName": "테테" }
      ]
    },
    {
      "groupSeq": 24,
      "groupName": "부산경찰청",
      "childPoliceInfo": [
        { "childGroupSeq": 32, "childGroupName": "동래경찰서" },
        { "childGroupSeq": 33, "childGroupName": "서면경찰서" }
      ]
    }
  ],
  "code": 200
}
```

## 특이사항

- `data`는 지방청 배열, 각 지방청에 `childPoliceInfo`(하위 경찰서 배열). 경찰서 없는
  지방청은 `childPoliceInfo: []`. 삭제 조직은 빠짐.
- `groupSeq`는 로그인 세션의 `groupSeq`(피전 계정 소속)와 같은 체계 — 동래경찰서 32는
  화면2 연동 때 확인한 값과 일치.
- 테스트 조직("테테")도 포함 — 필터 UI에 노출될 수 있음.
- **활용 제약**: 화면8 경호목록(`GetGuardCaseList`)은 각 행에 `groupName`(경찰서명
  문자열)만 주고 `groupSeq`도 상위 지방청도 없다 → 이 트리로 필터 **옵션 목록**은 채울 수
  있으나, 각 경호건 행을 지방청에 매칭하려면 `groupName` 문자열로 트리를 역탐색해야 한다
  (경찰서명 유니크 가정). 완전 해소하려면 `GetGuardCaseList` 응답에 `groupSeq` 또는
  `parentGroupName` 필요. 참고로 화면7 `GetDeployRequestList`는 이미 `parentGroupName`을
  준다.
