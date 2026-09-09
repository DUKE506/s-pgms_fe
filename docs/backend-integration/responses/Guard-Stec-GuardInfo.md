# Guard/Stec/W/GetGuardList · AddGuardInfo · PatchGuardInfo · DeleteGuardInfo

근무자(경호원) 마스터 CRUD 4종 — 한 화면(`/admin/workers`)이 쓰는 세트라 한 파일에 모음.

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `StecM1`(본사, 운영관리자) — 시스템관리자 전용 아님
- 엔드포인트:
  - `GET    /api/v1/Guard/Stec/W/GetGuardList`
  - `POST   /api/v1/Guard/Stec/W/AddGuardInfo`
  - `PATCH  /api/v1/Guard/Stec/W/PatchGuardInfo`
  - `DELETE /api/v1/Guard/Stec/W/DeleteGuardInfo?guardSeq={n}`

## GetGuardList

### 요청

파라미터 없음. `Authorization: Bearer {accessToken}`만.

### 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    { "guardSeq": 13, "sabun": "1111",   "name": "김가드",       "phone": "string" },
    { "guardSeq": 14, "sabun": "2222",   "name": "이가드",       "phone": "string" },
    { "guardSeq": 15, "sabun": "3333",   "name": "박가드",       "phone": "string" },
    { "guardSeq": 16, "sabun": "123123", "name": "최가드",       "phone": "010-000-0000" },
    { "guardSeq": 19, "sabun": "112323", "name": "테스트경호원", "phone": "01000000000" }
  ],
  "code": 200
}
```

## AddGuardInfo

### 요청

```json
{ "sabun": "ZZTEST9001", "name": "연동테스트근무자", "deptName": "연동테스트부서", "phone": "010-9001-0001" }
```

스웨거 `required`: `[deptName, name, sabun]` (`phone`은 nullable).

### 응답 (실제) — HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

생성된 `guardSeq`를 돌려주지 않음(`AddDeployRequest`와 동일 패턴) — 프론트는 목록을
재조회해 확인. 위 요청으로 `guardSeq: 20`이 생성됨(재조회로 확인).

## PatchGuardInfo

### 요청

```json
{ "guardSeq": 20, "name": "연동테스트근무자수정", "phone": "010-9001-9999", "deptName": "수정된부서" }
```

스웨거 `required`: `[guardSeq]`. `name`/`phone`/`deptName` 모두 nullable — 부분 수정 가능.
**`sabun`은 요청 스키마에 없음 → 사번 수정 불가.**

### 응답 (실제) — HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

재조회 결과 `guardSeq: 20`의 `name`/`phone`이 반영됨(`sabun`은 불변).

## DeleteGuardInfo

### 요청

`DELETE /api/v1/Guard/Stec/W/DeleteGuardInfo?guardSeq=20` — `guardSeq`는 쿼리 파라미터, 바디 없음.

### 응답 (실제) — HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

재조회 시 해당 행이 사라짐. 테스트로 만든 `guardSeq: 20`은 이 호출로 삭제해 원상복구함
(DB는 13·14·15·16·19 5행 상태로 복귀).

## 특이사항

- **공통 envelope**: 4종 모두 `{ message, data, code }`. 조회는 `data`가 배열, 나머지
  변경 3종은 `data: true`.
- **`deptName` 비대칭 (issues.md #8)**: DB에는 부서가 있다 —
  `GUARD_USER_INFO.DEPT_NM varchar(255) NOT NULL`(`docs/db-dump/stecPgms_GUARD_USER_INFO.sql`).
  `AddGuardInfo`/`PatchGuardInfo`도 `deptName`을 받아 정상 저장된다(실측). 그런데
  `GetGuardList` 응답에만 `deptName`이 **빠져 있고**, 근무자 단건 상세조회 API도 없다
  (스웨거 `Guard` read는 `GetGuardList` 하나). → 부서는 DB에 저장돼 있는데 조회로 못
  읽는다. 프론트는 목록/카드에서 "부서" 열을 뺐다(`exclusions.md` 참고). 등록/수정
  다이얼로그의 부서 입력은 유지(서버 저장은 정상).
- **ID 체계**: `guardSeq`는 정수. 프론트 `Worker.id`는 문자열이라 `String(guardSeq)`으로
  변환해서 매핑.
- **`phone`**: 포맷 강제 없음 — 기존 데이터에 `"string"`(백엔드 테스트 잔여물),
  하이픈 없는 `"01000000000"` 등 혼재.
- **권한**: 운영관리자(`StecM1`) 토큰으로 4종 모두 200. 시스템관리자 전용 아님
  (matrix 상 근무자 목록/등록은 운영·시스템관리자 공용, 배치요청 목록만 시스템관리자 추가).
- **테스트 시 부작용**: `AddGuardInfo`로 `guardSeq: 20`을 실제 생성했다가 `DeleteGuardInfo`로
  삭제해 원상복구 완료(사용자 승인 하에 "생성→확인→삭제" 방식).
