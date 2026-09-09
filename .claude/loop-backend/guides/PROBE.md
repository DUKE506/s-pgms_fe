# PROBE — 프로브 실무

`LOOP_INSTRUCTIONS.md` 3단계(②실행 첫 번째). 구현 전에 실백엔드 응답을 실측해 두는 작업.
2026-09-01부터 이 방식 — 이전엔 사용자에게 스웨거 UI 테스트를 부탁했었음.

## 순서

1. 계획서에서 나열한 API마다 `docs/backend-integration/responses/`에 실측 샘플이 있는지 확인.
2. 없으면 `local/_probe-NN.sh`를 만들어 실행(`NN` = `PROGRESS.md` 표 행 번호, 후속은
   `_probe-NNb.sh`). `local/`은 gitignore.
3. 확보한 응답을 `responses/<도메인>-<Police|Stec>-<동사명사>.md`에 저장(형식은
   `responses/README.md`). 원래 목적을 벗어나도 검증 중 자연히 알게 된 인접 정보(다른
   role의 응답 필드 등)는 함께 기록해도 되지만, 일부러 뒤 iteration 범위까지 앞서서 확보하러
   다니지는 않는다.
4. 결과를 화면 단위로 요약해 제시(LOOP 4단계) → G2.

## 스크립트 뼈대

```bash
#!/usr/bin/env bash
set -uo pipefail
API="${API_PROXY_TARGET:-http://<주소>}"   # .env.local 의 API_PROXY_TARGET
login() { curl -s -X POST "$API/api/v1/Login/W/Login" -H 'Content-Type: application/json' \
  -d "{\"loginId\":\"$1\",\"loginPw\":\"$2\"}"; }
tok() { echo "$1" | python -c "import sys,json;print((json.load(sys.stdin).get('data') or {}).get('accessToken',''))"; }
pp()  { python -c "import sys,json;print(json.dumps(json.load(sys.stdin),ensure_ascii=False,indent=2))"; }

T=$(tok "$(login <아이디> <비번>)")          # local/test-accounts.md
curl -s "$API/api/v1/<도메인>/<Police|Stec>/W/<동사명사>" -H "Authorization: Bearer $T" | pp
```

- `Login` 외 거의 모든 EP는 `Authorization: Bearer {accessToken}` 필요. 그 EP를 부를 권한이
  있는 역할의 계정으로 먼저 로그인.
- 응답 envelope는 `{message, data, code}`. 경호목록·이력 계열은 `data`가 다시 `{meta, data:[]}`
  이중 래핑. 게스트·근무자 등은 `data`가 평면 배열.

## `.claude/settings.local.json` allow 규칙

프로브 스크립트·curl 실행에는 allow 규칙이 필요하다. **분류기가 모델의 `settings.local.json`
편집을 막으므로 사용자가 직접 추가**한다(`Bash(bash .claude/loop-backend/local/_probe-*)`,
`Bash(curl:*)` 등). 이 파일은 gitignore(`.claude/settings.local.json`).

## 부작용 있는 호출

되돌리기 어렵거나 부작용 있는 호출은 **먼저 사용자에게 확인**한다:

- 비밀번호를 실제로 바꾸는 API, 계정을 새로 만드는 API(삭제 API가 없어 비활성화만 가능한
  경우 포함) 등. 선례: 로그인 연동 때 `ChangePassword`(테스트 계정 비번이 실제로 바뀜),
  `AddStecUser`(임시 계정, 완전 삭제 불가).
- 진행 방식(여분 계정 사용 / 생성 후 비활성화 / 아예 건너뛰기)을 선택지로 제시해 결정.
- 테스트 데이터를 만들었으면(게스트 계정 등) **끝나고 삭제**하고, 목록이 원래 상태로
  돌아왔는지 확인.

## 함정

- **curl `-d`로 한글을 보내면 인코딩이 깨진다.** git-bash에서 `-d '{"name":"한글"}'`이
  서버 500을 유발 → `--data-binary @file`(UTF-8 파일)로 보내면 정상. 프론트 `fetch`는
  영향 없으니 "실 API가 깨졌다"로 오진하지 말 것 (#16에서 실제로 겪음).
- `python` PYTHONIOENCODING — Windows 콘솔 출력에서 한글/유니코드 대시(—)가 `cp949`로
  깨지면 `PYTHONIOENCODING=utf-8` 접두.
- `deployReqSeq`/`caseSeq`에 없는 값을 넣으면 404("존재하지 않는 …") — 스코프 403과 구분.
