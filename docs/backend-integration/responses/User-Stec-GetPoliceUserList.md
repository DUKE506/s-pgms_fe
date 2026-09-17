# `GET /api/v1/User/Stec/W/GetPoliceUserList` 실측

2026-09-17, 4개 계정(SPoliceM1 본청 / SPoliceM3 지방청 / SPoliceM5 경찰서 / StecM1 본사
운영관리자)으로 실측. 계정 비밀번호 초기화 화면(경찰 #①②, 본사 #③) 연동에 사용.

## 스코프 확인

- **본청(SPoliceM1)**: `data`가 본청 자신(레벨1, `loginId:"SPoliceM1"`) 1개짜리 배열 —
  그 밑에 `children`으로 전국 지방청→경찰서가 전부 중첩. **본청 자기 자신도 트리에
  포함된다** — 별도 처리 없이 "본인 포함 초기화" 요구사항이 API 차원에서 해결됨.
- **지방청(SPoliceM3)**: `data`가 부산경찰청 자신 1개짜리 배열, `children`엔 관할
  경찰서(동래·서면)만.
- **경찰서(SPoliceM5)**: `data`가 동래경찰서 자신 1개짜리 배열, `children`은 빈 배열,
  `guestList`에 소속 게스트 5명.
- **본사(StecM1, 운영관리자)**: 본청과 동일하게 전국 전체.

## 게스트 위치

`children`이 아니라 **경찰서 노드의 별도 `guestList` 필드**에 `userInfo`와 같은 모양으로
붙는다. `codeSeq:7`/`codeName:"게스트"`. 게스트 없는 노드는 빈 배열(본청·지방청은 항상
빈 배열).

## 응답 예시(SPoliceM5 경찰서 스코프, 축약)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "groupSeq": 32,
      "groupName": "동래경찰서",
      "level": 3,
      "levelName": "경찰서",
      "parentGroupSeq": 24,
      "userInfo": {
        "userSeq": 111,
        "codeSeq": 6,
        "codeName": "피전",
        "loginId": "SPoliceM5",
        "userName": "동래경찰서",
        "phone": null,
        "useYn": true,
        "pwChangedYn": false
      },
      "guestList": [
        {
          "userSeq": 125,
          "codeSeq": 7,
          "codeName": "게스트",
          "loginId": "SPoliceGuest2",
          "userName": "게스트",
          "phone": null,
          "useYn": true,
          "pwChangedYn": true
        }
      ],
      "children": []
    }
  ],
  "code": 200
}
```

`codeSeq` 매핑: 4=본청관리자, 5=지방청관리자, 6=피전, 7=게스트(기존 스캐폴딩 mock 가정과
일치 확인).

프로브 스크립트: `local/_probe-accounts.sh`(gitignore).
