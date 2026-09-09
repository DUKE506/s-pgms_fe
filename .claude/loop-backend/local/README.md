# local/ (gitignore)

실백엔드 접속용 로컬 전용 파일. **커밋 금지** — 이 `README.md`만 추적된다.

- **`test-accounts.md`** — 실백엔드 테스트 계정(역할별 아이디/비번). 사용자로부터 직접
  전달받음(2026-09-01~). 프로브·`run-s-pgms` 검증에 사용.
- **`_probe-*.sh`** — iteration별 프로브 스크립트(`_probe-NN.sh`, 후속 `_probe-NNb.sh`).
  작성·실행법은 `../guides/PROBE.md`.

`.gitignore`가 `local/test-accounts.md`와 `local/_probe-*.sh`를 제외한다.
