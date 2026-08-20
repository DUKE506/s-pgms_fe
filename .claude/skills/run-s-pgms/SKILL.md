---
name: run-s-pgms
description: Build, run, and drive the s-pgms web app (Vite + React) for verification — launch the dev server, log in as a 경찰/본사 test account, click through screens, take screenshots, check console errors. Use when asked to run, start, or screenshot s-pgms, or to confirm a change works in the real app (not just tests).
---

s-pgms is a Vite + React + TypeScript SPA (경찰/본사 배치·관리 시스템, still
early — see `../../../docs/project-overview.md`). For agent/automated use,
drive it via the Playwright REPL driver at `driver.mjs` in this skill
directory. All paths below are relative to the repo root (`s-pgms/`).

## Prerequisites

```bash
npm install
npx playwright install chromium   # ~300MB, one-time; cached outside node_modules
```

## Run (agent path)

Pipe commands into the driver over stdin — no tmux needed, it processes
one line at a time and prints a result before the next:

```bash
node .claude/skills/run-s-pgms/driver.mjs <<'EOF'
start-server
launch
login-police gangnam password123
wait text=경찰 로그인 성공
ss 01-police-dashboard
storage
console
quit
EOF
```

Screenshots land in `.claude/skills/run-s-pgms/shots/` (override with
`SCREENSHOT_DIR`). The dev server runs on a fixed port (`5199`, override
with `PORT`) so it won't collide with a manually-run `npm run dev`.

### Commands

| command | what it does |
|---|---|
| `start-server` | launch `npm run dev` on the driver's port, wait until it responds |
| `stop-server` | kill whatever is listening on the driver's port |
| `launch` | start the server if needed, then launch headless Chromium |
| `nav <path>` | go to `http://localhost:<port><path>` |
| `login-police <id> <password>` | go to `/`, fill the 경찰 로그인 form, submit |
| `login-company <id> <password>` | go to `/admin`, fill the 본사 로그인 form, submit |
| `fill <selector> <text...>` | fill an input |
| `click <selector>` | click via CSS selector |
| `click-text <text>` | click the element containing this text |
| `wait <selector-or-text=...>` | wait up to 10s for a selector (Playwright text= locators work) |
| `ss [name]` | screenshot → `shots/<name>.png` |
| `storage [key]` | print a `localStorage` value (default key: `auth-storage`) |
| `text [selector]` | print `innerText` of an element (default: whole page) |
| `eval <js>` | evaluate an expression in the page, print JSON |
| `console` | print collected `console.error`/`pageerror` messages since `launch` |
| `quit` | close the browser and stop the server |

Test accounts live in `src/mocks/data/accounts.ts` (all passwords
`password123`): police — `hq`/`gyeonggi`/`gangnam`/`gangnamguest1`;
company — `sysadmin`/`opadmin`/`hqmanager1`.

## Run (human path)

```bash
npm run dev   # opens on the next free port starting at 5173
```

## Test suite

```bash
npm run test   # vitest run — unit/integration tests, MSW-backed
```

## Gotchas

- **Commands must be queued, not fired concurrently.** A heredoc piped
  into readline emits every `line` event back-to-back without waiting
  for the previous async command handler to finish — without the
  `Promise` queue in `driver.mjs`, `launch` and the command right after
  it race, and everything after `launch` fails with `ERROR: launch
  first` because `page` isn't set yet. If you extend the driver, keep
  routing commands through that queue.
- **Use a fixed `--strictPort`.** Plain `vite` picks the next free port
  silently, so a leftover dev server from an earlier session (there was
  one squatting on 5173 during development) makes the driver connect to
  the wrong instance. The driver always launches on `PORT` (default
  `5199`) with `--strictPort` and kills anything already there first.
- **Windows-only `killPort`.** `driver.mjs`'s port-killing uses
  `netstat`/`taskkill` (this project's dev machine is Windows). Swap in
  `lsof -ti:$PORT | xargs kill` if running this on Linux/macOS.
- **The two login pages have no design mock.** `docs/PGMS_UI_mock.dc.html`
  covers screens 1–12 (post-login); the login screens were built
  functionality-first, so don't expect them to match a visual spec —
  compare against `src/features/auth/pages/*LoginPage.tsx` instead.

## Troubleshooting

- **`ERROR: launch first` on every command:** the queue fix above wasn't
  applied, or `launch` itself errored — check the line right after
  `launch` printed `browser launched`.
- **`TIMEOUT waiting for server`:** something else is already bound to
  port `5199` and wasn't killed cleanly — run `stop-server`, or set
  `PORT` to a free one.
- **`wait` times out on a login success stub:** `/dashboard` and
  `/admin/dashboard` are temporary placeholders
  (`src/app/DashboardStub.tsx`) until the router+guard work lands; the
  text to wait for is literally `"경찰 로그인 성공"` / `"본사 로그인 성공"`,
  not a real dashboard heading.
