# 진행 상태

상태값: `대기` / `구현중` / `승인대기` / `부분완료(△)` / `완료`

`부분완료(△)` = 엔드포인트 교체는 끝났으나 실백엔드 데이터가 없어 일부 경로만 실측
검증된 상태. 남은 경로는 비고에 적은 후속 번호에서 재검증해야 하며, 그전까지 `완료`로
올리지 않는다.

각 화면의 상세 API 목록은 `docs/backend-integration-screen-api-matrix.md` 참고. 이 표는
**그 문서의 "권장 진행 순서"와 동일한 순서**로 정렬돼 있다. 큰 틀은 계정권한 단위로
화면군을 통째로 끝내고 다음 역할로 넘어가는 것 — 피전 → 운영관리자/시스템관리자 →
본부관리자 → 본청/지역청(2026-09-01 결정). 그 역할군 안에서는 조회(읽기) API를 먼저
연결해 뒤이어 연결하는 생성/수정 API의 결과를 확인할 수 있게 한다. "다음 대상"은 항상
이 표에서 상태가 `대기`인 것 중 번호가 가장 빠른 행이다.

| # | 역할 | 화면 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|
| 1 | 공통 | 로그인 | 완료 | `008383a` | 경찰/본사 실제로는 같은 엔드포인트 — 유일하게 역할보다 먼저 |
| 2 | [경찰서] 피전 | 경찰서 경호목록 | 완료 | `2679751` | 스코프는 서버가 403으로 강제(analysis.md 4-6 해소). 3번 직후 재검증 완료(새 접수 반영·mgmtNo 조합형태 확인). **배정 이후 상태 문자열은 여전히 미검증 → 12·16번 이후 재검증** |
| 3 | [경찰서] 피전 | 접수/배치요구서 작성 | 완료 | (이번 커밋) | `POST AddDeployRequest`. 2번 재검증 동시 소화(새 접수 반영·mgmtNo 조합형태·"접수" 라벨 확인). 배치장소는 API가 단일 필드라 주거지만 전송(D-2, issues #5). 폼: 요구자 3필드 분리 + 생년월일 입력(+ `DateField` yearGrid) |
| 4 | [경찰서] 피전 | 경호 상세 | 부분완료(△) | | **접수 상태만 실측 검증**(2026-09-03, 사용자 확인). 상세 조회·접수취소 정상. 배정 이후(경호취소·연장·단축·종결)는 실백엔드에 데이터가 없어 코드만 실엔드포인트로 교체하고 **미검증** → 12번(본사 경호 상세)에서 배정 데이터 생성 후 재검증 필수. 근무 스케줄/근무자 표시는 조회 API 누락(issues #6)이라 mock 연결 끊음 — #6 API 나오면 재연결. **완료 표시 보류** |
| 5 | [경찰서] 피전 | 배치요구서 수정 | 대기 | | |
| 6 | [경찰서] 피전 | 게스트 계정 관리 | 대기 | | 아이디 미리보기 이슈(issues.md #3) |
| 7 | [경찰서] 피전 | 이력 조회 | 대기 | | 이 시점엔 접수취소 정도만 있을 수 있음 — 16번 이후 재확인 |
| 8 | [경찰서] 게스트 | 경호목록 + 상세(조회전용) | 대기 | | 6·2 완료 후 |
| 9 | [본사] 운영/시스템관리자 | 근무자 목록/등록 | 대기 | | 12번(경호계획 등록)의 선행 의존성 |
| 10 | [본사] 운영/시스템관리자 | 배치요청 목록(+본부 배정) | 대기 | | 3번 데이터 필요. **여기서 GuardCase 최초 생성** |
| 11 | [본사] 운영/시스템관리자 | 경호목록 | 대기 | | 10번에서 배정한 건이 보여야 함 |
| 12 | [본사] 운영/시스템관리자 | 경호 상세 | 대기 | | 10·11 이후, 9번 근무자 필요. 첨부 3종 파일 업로드 재구현 필요(JSON→multipart). 완료 후 4번 재검증 |
| 13 | [본사] 운영/시스템관리자 | 연장/단축 요청 목록 | 대기 | | 4번(재검증)에서 경찰이 신청한 데이터 필요. 거부 API 이슈(issues.md #2) 방향 확정 후 |
| 14 | [본사] 운영/시스템관리자 | 관리자 계정 관리 | 대기 | | 11번 이후. 본부 이슈(issues.md #1) 방향 확정 후 |
| 15 | [본사] 운영/시스템관리자 | 이력 조회 | 대기 | | 4·12의 종결·취소 데이터 필요 — 운영관리자 화면군 중 가장 나중 |
| 16 | [본사] 본부관리자 | 스코프 재검증(경호목록/상세/연장단축/이력/관리자계정/근무자) | 대기 | | 새 API 연동 아님 — 9~15에서 이미 끝난 화면을 본부관리자로 재확인. 7번 이력 데이터도 함께 재확인 |
| 17 | [본청]/[지역청] | 이력 조회 | 대기 | | 4·12 데이터 필요 — 전체 중 가장 나중 |
| 18 | [본청]/[지역청] | 진행중 건 상세(조회전용) | 대기 | | 17과 함께 진행 |
| — | [본사]/[본청]/[지역청] | 대시보드 | 보류 | | Phase 4 자체가 보류 중 |

## 최근 iteration 로그

(진행하면서 아래에 짧게 기록 — 날짜, 무엇을 했는지, 막힌 점)

- 2026-09-03: 4번([경찰서] 피전 · 경호 상세) — **접수 상태만 부분 연동/검증(△, 완료 아님)**.
  `securityCaseDetail.ts` 5개 함수를 mock(`/security-cases/*`)에서 실엔드포인트로 교체:
  조회 `GET Deploy/Police/W/GetDeployDetail`, 접수취소·경호취소 공용 `POST CancelGuardCase`,
  연장/단축 `PATCH Extend|ShortenDeployPeriod`, 종결 `POST CloseGuardCase`. `splitMgmtNo`를
  `shared/lib/managementNumber.ts`로 추출(목록 연동과 공유). 취소/연장/종결 함수 반환형은
  `Promise<SecurityCase>` → `Promise<void>`(호출부가 결과를 안 씀).

  검증 범위: **접수 상태 상세 조회만 사용자 확인**. 접수취소는 버려도 되는 84·85번 건을
  새로 만들어 end-to-end 검증(생성 → UI/curl 취소 → 목록에서 사라짐, 81·82 무손상). 배정
  이후가 필요한 경호취소·연장·단축·종결은 실백엔드에 배정 건이 없어 **코드만 교체하고
  미검증**. 종결 DTO는 `caseSeq`를 요구하는데 `GetDeployDetail`이 안 줘서 `deployReqSeq`를
  임시로 넘김 — 12번에서 `GetGuardCaseDetail` 분기와 함께 재검증/수정.

  주요 발견: (a) `GetDeployDetail` 접수단계 응답은 `startDt`/`endDt` null, 경호기간은
  `periodFrom`/`periodTo`. 배치장소 4필드(`guardHomeLoc` 등)는 스키마에 존재하나 전부
  null(작성 때 D-2로 주거지만 보낸 값도 안 돌아옴) — issues #5 보강. (b) 성별·생년월일·
  직업·사건개요·참고사항 없음 → 5번(배치요구서 수정) prefill에서 별도 확인 필요
  (exclusions.md `경호 상세` 섹션). (c) 상세 진입 시 `RefreshToken` 4회 호출 문제 —
  원인은 `SecurityCaseDetailPage`가 mock 전용 `GET /api/workers`(본사 `GetGuardList`)를
  근무자 조인용으로 부르던 것. 실백엔드에서 401 → RefreshToken → React Query retry×3로
  증폭. 백엔드 확인 결과 **경호 상세에서 배정된 근무 스케줄을 조회하는 API 자체가 누락**
  (issues #6 신규). mock 연결을 끊어(`workers = []`) 상세 진입 API 호출을 `GetDeployDetail`
  1건으로 축소, 콘솔 에러 없음 확인.

  인프라: `mocks/handlers/deploy.ts`에 테스트 전용 더블 5개 추가(`GetDeployDetail` 외 4종).
  `GetDeployDetail` 더블은 `mock` 필드로 전체 `SecurityCase` 레코드를 실어 보내 배정 이후
  상태(baseInfo/schedule/attachments 등) 화면 회귀를 vitest 오프라인으로 유지 — 12번
  실측에서 정리.

  검증: `npm run test`(114/114)·lint·build 통과. 실백엔드 `run-s-pgms` — 동래
  (`SPoliceM5`) 로그인 → 경호목록 → 접수건 상세 진입 정상 렌더, 접수취소 end-to-end,
  콘솔 에러 없음. 응답 샘플: `docs/backend-integration-responses/Deploy-Police-GetDeployDetail.md`,
  `Deploy-Police-CancelGuardCase.md`.

  ⚠️ **완료 표시 보류** — 배정 이후 상태 + 12번(본사 경호 상세) 이후 재확인 필요.

- 2026-09-03: (작업 순서 관련 사용자 의견 — 아직 확정 아님) 경찰 경호관리 화면군(2~5번)이
  끝나면, 남은 순서를 loop-screens 때처럼 **메인 워크플로우 우선**으로 재정렬하는 방안
  검토. 지금 표는 "피전 게스트관리(6) → 피전 이력(7) → 게스트(8) → 본사..." 순인데, 이걸
  본사 메인 흐름(배치요청 → 배정 → 경호목록 → 경호 상세)을 먼저 하고 근무자·이력·게스트를
  뒤로 미루는 쪽으로. 5번 착수 전후에 사용자와 순서 재논의 후 표/roadmap 재정렬.

- 2026-09-02: 3번([경찰서] 피전 · 접수/배치요구서 작성) 연동 완료. `createSecurityCase`를
  mock(`POST /security-cases`) → `POST Deploy/Police/W/AddDeployRequest`로 교체.
  `SecurityCaseCreateInput`(폼) → `AddDeployRequestDto`(서버) 매핑, envelope 성공 판정.

  사전 결정 3건(사용자와 논의): (1) **요구자**를 단일 자유입력에서 `clientDept`/
  `clientPosition`/`clientName` 3필드로 분리 — 타입 `requester: string` → `{dept,
  position, name}`, 폼 8번 섹션 UI 변경. (2) **생년월일** — 출생년도 입력을 `DateField`
  생년월일 입력으로 교체, 타입 `subject.birthYear` → `birthDate`, `age` 제거(만나이는
  `shared/lib/subject.ts` `calcAge`로 계산해 표시). (3) **배치장소** — 폼은 주거지/직장지/
  기타1/기타2 4필드인데 실제 API는 `deploymentPlace` 단일. 폼을 줄이지 않고 백엔드에
  4필드 확장 요청(`issues.md` #5, `blockers.md`), 반영 전까지 **주거지만 전송하는 D-2
  임시 처리**(`exclusions.md`). 폼 변경분은 loop-screens 승인 절차대로 스크린샷 제시 후
  승인받음.

  주요 발견: (a) 성공 응답이 `{message, data:true, code:200}` — 생성된 `deployReqSeq`/
  `mgmtNo`를 안 돌려줌(프론트는 목록으로 이동해 확인). (b) 스웨거 `required`는
  `[groupSeq, suspectName]`뿐이지만 서버는 `suspectJob`/`suspectAddress`/
  `deploymentPlace`/`clientDept`/`clientPosition`/`clientName`도 필수로 강제(400 +
  `errors` 맵, DB `NOT NULL` 컬럼과 일치) — 우리 폼이 이미 전부 필수 검증이라 추가 대응
  불필요. (c) `mgmtNo` 조합형태 `"26-09-동래경찰서 접수"` 확정(2번 재검증). (d)
  `suspectGender` 코드 `0=남/1=여`(`genderLabelToCode`). (e) Windows Git Bash에서
  인라인 `curl -d` 한글이 cp949로 깨져 500 → UTF-8 파일 바디(`--data-binary @file`)로
  확인.

  캘린더: 생년월일용으로 `DateField`에 opt-in `yearGrid` prop 신규 — 캡션 클릭 시 9칸
  (3×3) 연도 그리드로 전환, ‹ › 9년 페이징, 값 있으면 그 연도 중앙. 배치기간 등 다른
  DateField는 기본값(off)이라 무변경. 이 테마에서 `--muted`/`--accent`가 `--background`와
  같은 색이라 header hover는 `color-mix(secondary, foreground 8%)` 사용. `YearGrid`는
  DayPicker root와 별개로 렌더돼 `--cell-size`/`--cell-radius`를 못 물려받아 고정값
  (`w-7 h-7`/`rounded-sm`) 사용. 부수 수정: `CalendarDayButton`의 `[&>span]:opacity-70`
  제거(선택일 흰 글자가 회색으로 보이던 문제, 앱 전체 date picker 공통 개선).

  인프라: 테스트 더블 `mocks/handlers/deploy.ts`에 `POST AddDeployRequest` 핸들러 추가
  (DTO를 다시 `SecurityCaseCreateInput`으로 되돌려 mock `createSecurityCase`에 넘겨
  같은 인메모리 배열에 쌓음). 캘린더 팝오버 3개를 순차 조작하는 폼 제출 테스트가 풀
  스위트 부하에서 기본 5초를 간헐 초과 → `vite.config.ts`에 `testTimeout: 15000`.

  검증: `npm run test`(114/114, 풀 스위트 3회 연속)·lint·build 통과. 실제 백엔드
  `run-s-pgms` — 동래(`SPoliceM5`) 로그인 → 신규접수 폼 작성 → 등록 → 경호목록에
  `"26-09-동래경찰서 · 접수" / 홍** / 2026.09.10~20` 렌더 확인, 콘솔 에러 없음. curl로
  성공 응답·검증 규칙 별도 확인. 검증 과정에서 동래에 실제 접수건 2건 생성됨(deploySeq
  81·82) — 되돌리지 않고 남겨둠, matrix 10번(본사 배치요청→배정) 입력 데이터로 재사용.

- 2026-09-01: 2번([경찰서] 피전 · 경찰서 경호목록) 연동 완료(구현 커밋 `2679751`).
  `listSecurityCases`를 `GET Deploy/Police/W/GetDeployList`로 교체.

  주요 발견/결정: (1) `groupSeq`가 필수 파라미터 — 토큰 소속으로 자동 추론 안 하고
  없으면 400. 로그인 시 `GetMyProfile.groupSeq`를 세션에 실어야 해서 `AuthUser`에
  `groupSeq?`/`groupName?`(optional) 추가, `login()`이 채우도록 함(로그인 iteration의
  exclusions 항목 해소). (2) 스코프 우려(analysis.md 4-6 / issues 스코프) 해소 —
  동래 토큰으로 타 `groupSeq` 요청 시 전부 403, 서버가 강제. (3) `mgmtNo`가 서버에서
  이미 조합된 완성 문자열("26-08-동래경찰서 접수" / 배정 후 "… ST###" 가정) — 사용자
  지시로 **마지막 공백에서 slice** 후 `formatManagementNumber`로 "· "재조합("… · 접수").
  기존 접수 행 표기가 "접수번호"만 → "접수번호 · 접수"로 바뀜(승인된 화면 대비 이
  부분만 변화, 관련 테스트 갱신). (4) 페이지네이션·status 파라미터 없음(전량 로드 +
  클라이언트 필터라 무관), `keyword`는 관리번호에만 매칭. (5) 배정 이후 `statusName`
  문자열이 프론트 라벨과 일치하는지는 데이터가 "접수" 1건뿐이라 미검증 —
  exclusions.md 기록, **3번 직후 + 12·16번 이후 목록 재검증** 필요.

  구현 결정(백엔드 갭 아님): `GuestListPage`(matrix 6번, 미연동)가 경호목록과
  `listSecurityCases`+쿼리키를 공유하고 있어, 실제 API로 교체하면 게스트 화면의
  `caseIds` 대조가 깨짐 — `GuestListPage`를 별도 mock 함수(`listGuestScopeSecurityCases`)
  +별도 쿼리키로 분리해 동작 불변으로 유지(6번 연동 때 정식 처리).

  인프라: 실제 연동 완료 경로(`GET /api/v1/Deploy/Police/W/GetDeployList`)를
  `mocks/handlers/deploy.ts`(테스트 전용, `server.ts`에만 등록)로 옮겨 브라우저는
  vite 프록시로 실제 백엔드, vitest는 오프라인 더블 사용 — 로그인 때 `auth.ts`
  분리와 동일 패턴. `index.ts`의 `testOnlyHandlers`를 `[...authHandlers,
  ...deployTestHandlers]`로 확장.

  검증: `npm run test`(114/114)·lint·build 통과. 실제 백엔드 `run-s-pgms` —
  `SPoliceM5`(동래경찰서→"피전") 로그인 시 세션 `groupSeq:32` 확인, 경호목록에
  실데이터 1건("26-08-동래경찰서 · 접수" / 접수 / 2026.08.19~23) 렌더, 데스크톱·
  모바일 회귀 없음, 콘솔 에러 없음. 응답 샘플:
  `docs/backend-integration-responses/Deploy-Police-GetDeployList.md`.

- 2026-09-01: 1번(로그인) 연동 완료(커밋 `008383a`). 응답 샘플 5개 확보 —
  Login/GetMyProfile/RefreshToken/Logout은 사용자가 준 실제 백엔드 주소로 직접
  curl해서 확보, ChangePassword는 임시 본부관리자 테스트 계정(`AddStecUser`로
  생성한 `StecM4`)을 만들어 최초 로그인 강제변경 흐름 전체(428 응답 → 변경 →
  재로그인)를 실제로 검증한 뒤 `useYn=false`로 비활성화(삭제 API 없어 완전
  삭제는 불가, 사용자 승인 하에 진행).

  주요 발견: (1) 로그인 응답엔 role이 없어 `GetMyProfile`을 이어서 호출해야
  함 — 다만 `Login` 응답의 `code` 필드가 `100+codeSeq`라 사실 로그인 응답만으로도
  역할 구분 자체는 가능하다는 것도 확인(사용자가 이 발견을 근거로 로그인 화면
  통합을 제안, roadmap.md 백로그로 별도 분리). (2) `codeSeq`→프론트 `Role` 매핑이
  꼭 필요 — 본청관리자/지방청관리자/피전처럼 실제 `codeName`과 우리 라벨이
  다름(`features/auth/lib/roleMapping.ts` 신규). (3) 응답이 공통으로
  `{message,data,code}` envelope — `shared/api/envelope.ts`로 공용 헬퍼화(앞으로
  연동하는 모든 화면이 재사용). (4) 최초 로그인은 200이 아니라 HTTP 428로 신호.
  (5) `ChangePassword`가 기존 비밀번호를 검증하지 않는 설계 특이점 발견 —
  issues.md #4로 기록, 사용자 결정으로 비밀번호 정책 확정 시까지 보류. (6)
  `RefreshToken`은 accessToken+refreshToken 둘 다 필요(mock은 refreshToken만
  보냈었음). (7) `Logout`은 mock에 없던 신규 기능이라 AppShell 로그아웃
  버튼에 새로 연결, 서버 세션이 실제로 끊기는 것까지 확인.

  인프라: vite dev 서버에 `/api/v1` 프록시 추가(`.env.local`의
  `API_PROXY_TARGET`, git 미커밋) — 연동 완료 경로는 실제 백엔드로, 나머지는
  MSW가 계속 처리하도록 분리(`mocks/handlers/index.ts`의 `handlers`/
  `testOnlyHandlers` 분리 — 브라우저는 `handlers`만, vitest는 둘 다 등록해
  연동된 화면도 오프라인 테스트 가능하게 함). 알려진 전환기 현상: 아직
  미연동인 화면(경호목록 등)은 실제 백엔드 계정으로 로그인하면 401 — mock
  seed 계정과 실제 백엔드 계정이 서로 다른 데이터라 생기는 것으로, 다음
  iteration들이 그 화면을 연결하면서 자연 해소(exclusions.md 기록).

  검증: `npm run test`(114/114)·lint·build 통과. 실제 백엔드 대상
  `run-s-pgms` 브라우저 검증 — 경찰(`SPoliceM5`, 동래경찰서→"피전" 배지)·
  본사(`StecM1`→"운영관리자") 로그인/로그아웃 정상, 콘솔에는 예상된(미연동
  화면의) 401 외 에러 없음.
