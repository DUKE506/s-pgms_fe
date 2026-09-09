# loop-backend — 백엔드 API 연동 loop

`docs/backend-integration/matrix.md`에 정리된 역할×화면×API를 하나씩 실제 백엔드
연동으로 바꾸는 작업(`mock 호출 → 실 API 호출`, 데이터 계층만 교체)의 운영 문서 일체.
화면(UI)은 이미 `loop-screens`에서 구현·승인된 상태다.

## 여기서부터 읽어라

1. **`TASK.md`** — 이 loop이 뭐고, 어떤 기준으로 판단하고, 언제 멈추는가 (정책)
2. **`LOOP_INSTRUCTIONS.md`** — 한 iteration을 어떤 순서로 밟는가 (실행 절차)
3. **`PROGRESS.md`** — 지금 어디까지 했는가 (매 iteration 갱신)
4. **`CARRYOVER.md`** — 나중에 다시 봐야 하는 것들 (재검증·회신 대기)

## 하위 폴더

- **`templates/`** — 게이트에 제출하는 산출물 양식 (작업계획서 / 완료 보고서)
- **`guides/`** — `LOOP_INSTRUCTIONS`가 짧게 참조하는 상세 지침 (프로브 실무 / 섹션 종료 절차)
- **`local/`** — gitignore. 실백엔드 접속용 로컬 전용 파일 (테스트 계정 / 프로브 스크립트)

"무엇을 연동하는가"의 기록(대상·발견·근거·산출물)은 `docs/backend-integration/`.
