// REPL driver for s-pgms (Vite + React web app).
// Launches the Vite dev server, drives it with Playwright Chromium
// (headless), and exposes commands over stdin for an agent to pipe in.
//
// Usage: node .claude/skills/run-s-pgms/driver.mjs
// Then type commands, one per line (see SKILL.md for the list).

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

// Windows-only (this project's dev machine). Adjust for other platforms
// if this driver is ever run elsewhere.
function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
    const pids = [...new Set(out.trim().split('\n').map((l) => l.trim().split(/\s+/).pop()))]
    for (const pid of pids) {
      if (pid) execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
    }
  } catch {
    // nothing listening on that port — fine
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

  // App-specific helper: log in as a police-mode account (경찰서/본청/지역청/게스트).
  // Fixture accounts live in src/mocks/data/accounts.ts.
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

  // App-specific helper: log in as a company-mode account (시스템관리자/운영관리자/본부관리자).
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

// Commands must run one at a time. A piped-in heredoc emits every 'line'
// event back-to-back without waiting for the async handler above to
// finish, so without this queue "launch" and "login-police" race each
// other and "launch" never gets far enough to set up `page`.
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
