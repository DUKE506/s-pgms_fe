// s-pgms(Vite + React 웹앱)용 REPL 드라이버.
// Vite dev server를 띄우고 Playwright Chromium(headless)으로 구동하며,
// 에이전트가 파이프로 흘려보낼 수 있도록 stdin으로 커맨드를 받는다.
//
// 사용법: node .claude/skills/run-s-pgms/driver.mjs
// 커맨드를 한 줄씩 입력 (전체 목록은 SKILL.md 참고)

import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as net from 'node:net'

const APP_DIR = path.resolve(import.meta.dirname, '../../..')
const PORT = Number(process.env.PORT || 5199)
const BASE = `http://localhost:${PORT}`
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, '.claude/skills/run-s-pgms/shots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

let serverProc = null
let browser = null
let page = null
let consoleErrors = []

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, 'localhost')
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
  })
}

async function waitForPort(port, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return true
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

// Windows 전용 구현 (이 프로젝트의 개발 환경 기준). 다른 OS에서 이 드라이버를
// 돌린다면 여기를 그 플랫폼에 맞게 바꿔야 함.
function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
    const pids = [...new Set(out.trim().split('\n').map((l) => l.trim().split(/\s+/).pop()))]
    for (const pid of pids) {
      if (pid) execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
    }
  } catch {
    // 해당 포트에 아무것도 떠 있지 않으면 정상 — 그냥 넘어감
  }
}

const COMMANDS = {
  async 'start-server'() {
    if (serverProc) return console.log('server already running')
    if (await portOpen(PORT)) {
      console.log(`port ${PORT} already occupied by something else — killing it first`)
      killPort(PORT)
    }
    serverProc = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
      cwd: APP_DIR,
      shell: true,
      stdio: 'ignore',
    })
    const up = await waitForPort(PORT, 30_000)
    console.log(up ? `server up on ${BASE}` : 'TIMEOUT waiting for server')
  },

  async 'stop-server'() {
    killPort(PORT)
    serverProc = null
    console.log('server stopped')
  },

  async launch() {
    if (!serverProc && !(await portOpen(PORT))) await COMMANDS['start-server']()
    if (browser) return console.log('already launched')
    browser = await chromium.launch()
    page = await browser.newPage()
    consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (err) => consoleErrors.push(String(err)))
    console.log('browser launched')
  },

  async nav(p) {
    if (!page) return console.log('ERROR: launch first')
    await page.goto(BASE + (p || '/'))
    console.log('nav ->', BASE + (p || '/'))
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first')
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png')
    await page.screenshot({ path: f })
    console.log('screenshot:', f)
  },

  async fill(args) {
    if (!page) return console.log('ERROR: launch first')
    const [sel, ...rest] = args.split(' ')
    await page.fill(sel, rest.join(' '))
    console.log('fill', sel, '-> ok')
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first')
    await page.click(sel)
    console.log('click', sel, '-> ok')
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first')
    await page.click(`text=${text}`)
    console.log('click-text', JSON.stringify(text), '-> ok')
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first')
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel) }
    catch { console.log('TIMEOUT:', sel) }
  },

  // 앱 전용 헬퍼: 경찰 모드 계정(경찰서/본청/지역청/게스트)으로 로그인.
  // fixture 계정은 src/mocks/data/accounts.ts에 있음.
  async 'login-police'(args) {
    if (!page) return console.log('ERROR: launch first')
    const [id, password] = args.split(' ')
    await page.goto(BASE + '/')
    await page.waitForSelector('h1:has-text("경찰 로그인")')
    await page.fill('#police-id', id)
    await page.fill('#police-password', password)
    await page.click('button:has-text("로그인")')
    console.log('submitted police login for', id)
  },

  // 앱 전용 헬퍼: 본사 모드 계정(시스템관리자/운영관리자/본부관리자)으로 로그인.
  async 'login-company'(args) {
    if (!page) return console.log('ERROR: launch first')
    const [id, password] = args.split(' ')
    await page.goto(BASE + '/admin')
    await page.waitForSelector('h1:has-text("본사 로그인")')
    await page.fill('#company-id', id)
    await page.fill('#company-password', password)
    await page.click('button:has-text("로그인")')
    console.log('submitted company login for', id)
  },

  async storage(key) {
    if (!page) return console.log('ERROR: launch first')
    console.log(await page.evaluate((k) => localStorage.getItem(k), key || 'auth-storage'))
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first')
    console.log(await page.evaluate((s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null))
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first')
    try { console.log(JSON.stringify(await page.evaluate(expr))) }
    catch (e) { console.log('ERROR:', e.message) }
  },

  console() {
    console.log('console errors:', consoleErrors.length ? consoleErrors : 'none')
  },

  async quit() {
    if (browser) await browser.close().catch(() => {})
    browser = null
    page = null
    if (serverProc) await COMMANDS['stop-server']()
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  },
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'driver> ' })

// 커맨드는 반드시 하나씩 순차 실행되어야 함. 파이프로 흘려보낸 heredoc은
// 위 async 핸들러가 끝나길 기다리지 않고 모든 'line' 이벤트를 연달아
// 발생시키므로, 이 큐가 없으면 "launch"와 "login-police"가 서로 경합해서
// "launch"가 `page`를 세팅하기도 전에 다음 커맨드가 실행돼버림.
let queue = Promise.resolve()

async function handleLine(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/)
  if (!cmd) return rl.prompt()
  const fn = COMMANDS[cmd]
  if (!fn) { console.log('unknown:', cmd, '— try: help'); return rl.prompt() }
  try { await fn(rest.join(' ')) } catch (e) { console.log('ERROR:', e.message) }
  if (cmd === 'quit') { rl.close(); process.exit(0) }
  rl.prompt()
}

rl.on('line', (line) => { queue = queue.then(() => handleLine(line)) })
rl.on('close', async () => { await queue; await COMMANDS.quit(); process.exit(0) })

console.log('s-pgms driver — "help" for commands, "start-server" then "launch" to begin')
rl.prompt()
