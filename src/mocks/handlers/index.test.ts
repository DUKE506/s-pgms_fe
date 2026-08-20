import { describe, expect, it } from 'vitest'

describe('MSW handler wiring', () => {
  it('intercepts /api/health via the shared handlers array', async () => {
    const res = await fetch('/api/health')
    expect(res.ok).toBe(true)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })
})
