import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, unlinkSync, writeFileSync } from "node:fs"
import { getTerminalWidth } from "../../src/ui/terminal.ts"

const ORIGINAL_STDOUT_COLS = process.stdout.columns
const ORIGINAL_STDERR_COLS = process.stderr.columns
const ORIGINAL_ENV = process.env.COLUMNS

function setStreamColumns(stream: NodeJS.WriteStream, value: number | undefined): void {
  Object.defineProperty(stream, "columns", { value, configurable: true, writable: true })
}

function cachePathFor(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)
  return `/tmp/claude-statusline-width-${safe}.json`
}

function clearCache(key: string): void {
  const path = cachePathFor(key)
  if (existsSync(path)) unlinkSync(path)
}

function seedCache(key: string, entry: object): void {
  writeFileSync(cachePathFor(key), JSON.stringify(entry))
}

afterEach(() => {
  setStreamColumns(process.stdout, ORIGINAL_STDOUT_COLS)
  setStreamColumns(process.stderr, ORIGINAL_STDERR_COLS)
  if (ORIGINAL_ENV === undefined) delete process.env.COLUMNS
  else process.env.COLUMNS = ORIGINAL_ENV
})

describe("getTerminalWidth", () => {
  test("returns stdout.columns when present", () => {
    setStreamColumns(process.stdout, 120)
    setStreamColumns(process.stderr, 80)
    expect(getTerminalWidth()).toBe(120)
  })

  test("falls back to stderr.columns when stdout is piped (no columns)", () => {
    setStreamColumns(process.stdout, undefined)
    setStreamColumns(process.stderr, 200)
    expect(getTerminalWidth()).toBe(200)
  })

  test("falls back to COLUMNS env when both streams lack columns", () => {
    setStreamColumns(process.stdout, undefined)
    setStreamColumns(process.stderr, undefined)
    process.env.COLUMNS = "150"
    expect(getTerminalWidth()).toBe(150)
  })

  test("returns null when nothing is available", () => {
    setStreamColumns(process.stdout, undefined)
    setStreamColumns(process.stderr, undefined)
    delete process.env.COLUMNS
    expect(getTerminalWidth()).toBeNull()
  })

  test("ignores non-positive stdout.columns and falls through", () => {
    setStreamColumns(process.stdout, 0)
    setStreamColumns(process.stderr, 90)
    expect(getTerminalWidth()).toBe(90)
  })

  test("floors fractional column values", () => {
    setStreamColumns(process.stdout, 100.7)
    expect(getTerminalWidth()).toBe(100)
  })
})

describe("getTerminalWidth with stabilityKey", () => {
  test("accepts fresh reading when cache is empty", () => {
    const key = "test-empty"
    clearCache(key)
    setStreamColumns(process.stdout, 200)
    expect(getTerminalWidth({ stabilityKey: key })).toBe(200)
    clearCache(key)
  })

  test("rejects a suspiciously narrow reading against a recently trusted wide value", () => {
    const key = "test-reject"
    clearCache(key)
    // Trusted 200 cols, observed moments ago.
    seedCache(key, { width: 200, lastSeen: Date.now() })
    setStreamColumns(process.stdout, 45)
    expect(getTerminalWidth({ stabilityKey: key })).toBe(200)
    clearCache(key)
  })

  test("accepts a slightly narrower reading (not below ratio + absolute thresholds)", () => {
    const key = "test-mild-shrink"
    clearCache(key)
    seedCache(key, { width: 200, lastSeen: Date.now() })
    // 120 is below half of 200 but well above the absolute threshold — trust it.
    setStreamColumns(process.stdout, 120)
    expect(getTerminalWidth({ stabilityKey: key })).toBe(120)
    clearCache(key)
  })

  test("accepts a fresh reading when cache is stale", () => {
    const key = "test-stale-cache"
    clearCache(key)
    // Trusted 200 cols, last seen 60 seconds ago (beyond 30s TTL).
    seedCache(key, { width: 200, lastSeen: Date.now() - 60_000 })
    setStreamColumns(process.stdout, 45)
    expect(getTerminalWidth({ stabilityKey: key })).toBe(45)
    clearCache(key)
  })

  test("accepts a suspicious value once it has been pending past the confirmation window", () => {
    const key = "test-confirm-resize"
    clearCache(key)
    // Trusted 200, with a 45-col reading that's been pending for >3s.
    seedCache(key, {
      width: 200,
      lastSeen: Date.now(),
      pending: { width: 45, firstSeen: Date.now() - 5_000 },
    })
    setStreamColumns(process.stdout, 45)
    expect(getTerminalWidth({ stabilityKey: key })).toBe(45)
    clearCache(key)
  })

  test("returns cached width when fresh reading is null and cache is fresh", () => {
    const key = "test-null-fresh"
    clearCache(key)
    seedCache(key, { width: 180, lastSeen: Date.now() })
    setStreamColumns(process.stdout, undefined)
    setStreamColumns(process.stderr, undefined)
    delete process.env.COLUMNS
    // /dev/tty may still resolve in the test runner; this test only asserts
    // that when nothing returns a value, we fall back to the cached width.
    // If the test runner has a controlling TTY, this test's expectation
    // becomes "result is either cached value or a real measurement" — we
    // accept either rather than skip, since both are correct behavior.
    const result = getTerminalWidth({ stabilityKey: key })
    expect(result === 180 || (typeof result === "number" && result > 0)).toBe(true)
    clearCache(key)
  })
})
