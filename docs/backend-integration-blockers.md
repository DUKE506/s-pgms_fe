# 백엔드 연동 — 블로커 로그

`docs/backend-integration-process.md` 원칙 2 적용 항목을 기록합니다. 사전 분석에서
걸러지지 않은 채로 실제 연동 작업 중 발견된, 진행을 막는 수준의 불일치를 기록합니다.
사용자에게 바로 물어봐서 그 자리에서 해결된 경우는 여기 남기지 않아도 됩니다 — 당장 답을
듣기 어렵거나 다른 작업을 먼저 이어가야 할 때만 기록합니다.

## 형식

```
## [블로커 제목]

**상황**: 어떤 작업을 하다가 무엇을 발견했는지
**문제**: 왜 이 상태로는 계속할 수 없는지
**해결되어야 하는 것**: 진행하려면 무엇이 확정/변경돼야 하는지
**해결방안 후보**:
1. 방안 A — 설명, 트레이드오프
2. 방안 B — 설명, 트레이드오프
**상태**: 확인 대기 / 진행 중 / 해결됨
```

---

## 배치요구서 배치장소 4필드 ↔ 실제 API 단일 필드 (`deploymentPlace`)

**상황**: 화면3([경찰서] 접수/배치요구서 작성) 연동 중(2026-09-02). 우리 폼은 배치장소를
주거지/직장지/기타1/기타2 4필드로 받는데 `AddDeployRequestDto`·DB는 `deploymentPlace`
단일 varchar(255) 1개뿐.
**문제**: 4필드를 1필드에 합치면 상세/수정 화면에서 다시 분리 표시가 불가능하고, 본사
경호계획의 장소별 배치·스케줄 편성 전제가 깨진다.
**해결되어야 하는 것**: 백엔드가 배치장소를 4필드(또는 최소 주거지/직장지 2필드)로 확장
(`docs/backend-integration-issues.md` #5).
**해결방안 후보**:
1. 백엔드 4필드 확장 대기 후 정식 매핑 — 깔끔하나 확장 전까지 화면4(상세)에서 배치장소가
   불완전.
2. **(채택, D-2)** 나머지 필드는 지금 다 연동하고 `deploymentPlace`엔 주거지만 전송,
   직장지·기타는 임시 제외. 백엔드 4필드 반영 시 매핑만 교체. — 피전 화면군 진행을 막지
   않음. 트레이드오프: 확장 전까지 직장지·기타 장소가 백엔드에 저장 안 됨.
**상태**: **해결됨(2026-09-03)** — 백엔드가 `Add/UpdateDeployRequestDto`를 `guardHomeLoc`/
`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드로 수정. 프론트가 4필드 매핑으로 교체,
D-2 제거. 쓰기 테스트(deploySeq 87)로 왕복 확인(issues #5).

---

## 배치요구서 수정(화면5) prefill 소스가 없음 — 배치요구서 원본 상세조회 API 부재

**상황**: 화면5([경찰서] 피전 · 배치요구서 수정) 연동 착수(2026-09-03). prefill 소스로
`GetDeployDetail`을 쓰려 했으나, 사용자 설명으로 이 엔드포인트가 **상세페이지 표시용
"기본정보" 뷰**(배정 후 본사가 등록, 접수단계엔 배치요구서를 임시 매핑)임을 확인.
배치요구서 원본에만 있는 필드(성별·생년월일·직업·사건개요·참고사항·배치장소 4필드)를
안 돌려준다.
**문제**: `SecurityCaseForm`의 필수 필드를 prefill할 수 없어 저장이 불가능하고, 빈 값을
`UpdateDeployRequest`에 실으면 기존 DB 값을 덮어쓸 위험. 조회/저장을 같이 붙여야 실측이
되는데 조회 소스 자체가 없음.
**해결되어야 하는 것**: 배치요구서 원본을 그대로 돌려주는 조회 API 신설
(`docs/backend-integration-issues.md` #7).
**해결방안 후보**:
1. **(채택, a안)** 화면5 전체를 보류하고 그룹 B(#6 본사 근무자 목록)로 진행. 신규 조회
   API가 오면 조회+저장을 함께 연동·실측하고 복귀. — 피전 경호관리 섹션의 마지막 화면이라
   섹션 일괄 요청(#5·#6·#7)에 묶어 전달하면 진행이 막히지 않음.
2. 저장 API(`PUT UpdateDeployRequest`)만 코드 교체(미검증, △) 후 그룹 B로. — #4의 배정
   이후 액션과 같은 패턴이나, prefill이 없어 어차피 화면 자체가 동작 안 함 → 반쪽짜리.
**상태**: **해결됨(2026-09-03)** — 백엔드가 `GET Deploy/Police/W/GetDeployDetailUpdate`
응답을 구현(배치요구서 원본 필드 전부 반환, 접수·배정 모두 200). 화면5를 이걸로 prefill +
`PUT UpdateDeployRequest`로 저장 연동 완료, 브라우저 왕복 검증(issues #7). a안대로 그룹 B를
먼저 돌고(#6·#7) 복귀해 마무리.

---

## 경호계획 등록(AddGuardCaseInfo)에 필요한 "배치기간"을 본사 조회로 얻을 수 없음

**상황**: 화면9([본사] 경호 상세) 연동(2026-09-04). 경호계획 등록 폼(`BaseInfoForm`)은
배치기간(시작일/종료일)을 배치요구서 값 그대로 고정 표시(disabled)하고, `AddGuardCaseInfo`
DTO는 `startDt`/`endDt`(배치기간+배치시간 결합)를 **required**로 받는다.
**문제**: 경호계획 미등록(배정) 상태에서 `GetGuardCaseDetail`은 `startDate`/`endDate`를
`null`로 준다(등록 후에만 채워짐). `GetGuardCaseList`도 배정 건은 기간이 null,
`GetDeployRequestList`는 배정되면 목록에서 빠진다. 본사 토큰으로 `Deploy/Police/W/
GetDeployDetail*`(배치요구서 기간 보유)을 부르면 **403**(2026-09-04 실측). → 본사가
배정 건의 배치기간을 조회할 경로가 없다. 폼의 배치기간 칸이 빈 값이라 등록 시 `startDt`가
`"T09:00:00"`(날짜 없음)로 나가 실패한다.
**해결되어야 하는 것**: 아래 중 하나.
1. `GetGuardCaseDetail`(또는 `GetGuardCaseList`)이 경호계획 미등록 상태에서도 배치요구서
   기간(`periodFrom`/`periodTo`)을 실어준다.
2. `AddGuardCaseInfo`가 `startDt`/`endDt`를 optional로 받고, 미지정 시 서버가 배치요구서
   기간 + 폼이 보낸 배치시간으로 조합한다.
3. 본사용 배치요구서 원본 조회 API 신설(issues #7 3항과 동일 — 본사 권한 확장/대칭 EP).
**해결방안 후보(프론트)**:
1. **(채택)** 코드는 폼값(`securityCase.startDate/endDate`) 기준으로 `startDt`/`endDt`를
   보내도록 구현해 두고, 값이 있는 경우(= 백엔드가 기간을 주게 되면)엔 그대로 동작.
   그전까지 **경호계획 "등록" 경로는 실백엔드에서 미검증**(수정=PatchCaseInfo 경로는
   기간 불필요라 완전 동작, 브라우저 검증 완료). PROGRESS #9 = 부분완료(△).
2. 등록 폼의 배치기간을 사용자 입력 가능하게 전환 — 승인된 화면 설계("고정 적용")를
   바꿔야 하고 오입력 위험. 보류.
**상태**: **해결됨(2026-09-07) — 연동·검증 완료**. 백엔드가 섹션 B-1 요청서(요청 1·2)
응답으로 `GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=`를 신설(접수·배정·경호계획
미등록 무관하게 `periodFrom`/`periodTo` 반환). 화면9 `getSecurityCase`가 `GetCaseDoc`의
`deploySeq`로 이 EP를 호출(`fetchDeployRequestDetail`) → `mergeDeployRequest`가 경호계획
미등록 건의 `startDate`/`endDate`를 배치요구서 기간으로 채운다. 브라우저 검증(caseSeq 48,
배정+미등록): `BaseInfoForm` 배치기간 2026-09-12 ~ 2026-09-22 표시, `periodMissing` 경고
사라짐, "등록" 버튼 활성. issues #7·#10 → 🟢. 응답 샘플
`docs/backend-integration-responses/GuardCase-Stec-GetDeployDetail.md`.

---

## [본사] 이력 조회 상세 — 본사(Stec)용 조회 EP가 없음

**상황**: 화면13([본사] 이력 조회) 연동(2026-09-08). 목록(`History/Stec/W/GetHistoryList`)은
정상 연동했으나 상세(`/admin/history/:id`)에 붙일 엔드포인트가 없다.
**문제**: `History/Stec/W/GetHistoryDetail`은 404(경로 없음), `History/Police/W/GetHistoryDetail`은
본사 토큰에 403(피전 토큰으론 200). → [본사] 이력 상세를 조회할 방법이 없다.
**해결되어야 하는 것**: `History/Stec/W/GetHistoryDetail` 신설 또는 Police EP 권한 확장
(`docs/backend-integration-issues.md` #14).
**해결방안 후보(프론트)**:
1. **(채택)** 목록만 연동하고 상세 화면은 "준비 중" 안내로 둔다(`getCompanyHistoryDetail`은
   `CompanyHistoryDetailUnavailableError` throw). 목록 행 클릭 → 안내 화면. EP가 오면
   조회 연동 + 기존 상세 레이아웃 복원. — 그룹 C 진행을 막지 않음.
2. 목록 행을 클릭 불가로 바꾼다 — 승인된 화면(행 클릭 → 상세) 동작을 더 크게 바꾸게 됨. 보류.
**상태**: 확인 대기 — 그룹 C(이력) 섹션 종료(#15) 시 일괄 요청. PROGRESS #13 = 부분완료(△).
→ **전달됨**: `docs/backend-integration-requests/2026-09-08-이력-C.md`(2026-09-08).

---

## [본청]/[지역청] 이력 조회 — 관할 전체·진행중 조회 경로가 없음

**상황**: 화면15([본청]/[지역청] 이력 조회) 착수 프로브(2026-09-08). 경찰서 경로(#14)는
실 API 전환됐고 본청/지역청 경로를 전환하려 했다.
**문제**: (1) `History/Police/W/GetHistoryList`·`Deploy/Police/W/GetDeployList` 둘 다
`groupSeq`가 **경찰서(leaf) 노드일 때만** 데이터를 준다 — 부모 노드(본청 22·지방청 24)로는
0건이라 관할 전체를 한 번에 못 받는다. (2) `GetHistoryList`는 종결·취소만 주고 진행중
포함 토글이 없다 — 본청/지역청 이력 화면은 진행중 건도 보여야 하는데(2026-08-27 결정).
**해결되어야 하는 것**: `GetHistoryList`(+진행중 목록)가 부모 `groupSeq` 캐스케이드를
지원하거나, 본청/지역청용 통합 조회 EP 신설 (`docs/backend-integration-issues.md` #15).
**해결방안 후보(프론트)**:
1. `Login/W/GetGroupTree`(3역할 공통 200, 서브트리 반환)로 leaf `groupSeq` 목록을 뽑아
   경찰서마다 `GetHistoryList`+`GetDeployList`를 호출해 합친다 — 스코프는 안전하나
   경찰서 수만큼 N×2 호출. **임시방편이라 채택 안 함(사용자 결정 2026-09-08).**
2. **(채택)** 본청/지역청 이력은 mock 유지, #15는 부분완료(△)로 두고 백엔드 요청 후
   회신 시 실 API 전환. 경찰서 경로(#14)는 실 API 그대로 — 그룹 C 진행을 막지 않음.
**상태**: 확인 대기 — 전달됨 `docs/backend-integration-requests/2026-09-08-이력-C.md`
(2026-09-08). PROGRESS #15 = 부분완료(△).
