# Login/W/GetMyProfile

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서) / `StecM1`(본사, 운영관리자) — 위 Login 응답의 accessToken을 `Authorization: Bearer`로 사용
- 엔드포인트: `GET /api/v1/Login/W/GetMyProfile`

## 요청

헤더만 있음: `Authorization: Bearer {accessToken}`

## 응답 (실제) — 경찰(피전)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "userSeq": 111,
    "userName": "동래경찰서",
    "codeSeq": 6,
    "codeName": "피전",
    "groupSeq": 32,
    "groupName": "동래경찰서"
  },
  "code": 200
}
```

## 응답 (실제) — 본사(운영관리자)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "userSeq": 54,
    "userName": "HS1운영",
    "codeSeq": 2,
    "codeName": "운영관리자",
    "groupSeq": null,
    "groupName": null
  },
  "code": 200
}
```

## 응답 (실제) — 본청 / 지방청

```json
{
  "userSeq": 50, "userName": "본청", "codeSeq": 4, "codeName": "본청관리자",
  "groupSeq": 22, "groupName": "본청"
}
```

```json
{
  "userSeq": 52, "userName": "부산경찰청", "codeSeq": 5, "codeName": "지방청관리자",
  "groupSeq": 24, "groupName": "부산경찰청"
}
```

## 실측으로 확정한 `codeSeq` → 프론트 `Role` 매핑

| codeSeq | 실제 `codeName` | 프론트 `Role` | 비고 |
|---|---|---|---|
| 1 | 시스템관리자 | `시스템관리자` | 그대로 일치 |
| 2 | 운영관리자 | `운영관리자` | 그대로 일치 |
| 3 | 본부관리자 | `본부관리자` | 그대로 일치 |
| 4 | 본청관리자 | `본청` | **불일치 — 매핑표 필요** |
| 5 | 지방청관리자 | `지역청` | **불일치 — 매핑표 필요, "지방청"↔"지역청" 용어 자체가 다름** |
| 6 | 피전 | `경찰서` | **불일치 — 매핑표 필요** |
| 7 | (미실측, 게스트 계정으로 추정) | `게스트` | 게스트 계정으로 직접 확인 필요(발급 연동 시점) |

`codeName`을 화면에 그대로 쓰면 안 되고, `codeSeq`(정수) 기준으로 프론트 `Role` 문자열로 변환하는
공용 매핑 헬퍼가 필요함이 실측으로 확정됨.

## 특이사항

- `codeSeq`/`codeName`이 `docs/backend-integration-analysis.md` 6-1의 `BASIC_CODE` 매핑과 일치 (2=운영관리자, 6=피전).
- **경찰 계정의 `userName`은 개인 이름이 아니라 소속 조직명**("동래경찰서") — 경찰 계정이 조직 노드별 1개 공유 계정이라는 analysis.md 1-3 설명과 일치. 본사 계정은 반대로 개인 이름("HS1운영").
- **`groupSeq`/`groupName`은 경찰만 값이 있고 본사는 `null`** — 본사 쪽 "본부" 소속은 여기서도 안 내려옴(이미 issues.md #1로 기록된 공백과 일치, `groupSeq`는 경찰 조직트리(`POLICE_GROUP_INFO`) 전용으로 보임).
- 역할 판별에 필요한 필드는 `codeSeq`(정수) — 프론트 `Role`(한글 라벨) 매핑 헬퍼가 필요.
- `id`(로그인 아이디) 자체는 이 응답에 없음 — 필요하면 로그인 폼 입력값을 그대로 세션에 들고 있거나, accessToken 페이로드의 `loginId`를 디코딩해서 써야 함.
