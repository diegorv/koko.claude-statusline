import { afterEach, describe, expect, test } from "bun:test"
import { getTerminalWidth } from "../../src/ui/terminal"

const ORIGINAL_STDOUT_COLS = process.stdout.columns
const ORIGINAL_STDERR_COLS = process.stderr.columns
const ORIGINAL_ENV = process.env.COLUMNS

function setStreamColumns(stream: NodeJS.WriteStream, value: number | undefined): void {
  Object.defineProperty(stream, "columns", { value, configurable: true, writable: true })
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
