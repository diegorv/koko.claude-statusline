import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { buildSnapshot, exportAgentBar } from "../../src/export/agent-bar.ts"
import { mapRawToStdinData } from "../../src/parsing/stdin.ts"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const TMP_DIR = join(tmpdir(), "claude-statusline-agent-bar-tests")

const data = mapRawToStdinData({
  model: { display_name: "Opus 5.5 (1M context)" },
  context_window: { used_percentage: 37.4, current_usage: { input_tokens: 100, cache_read_input_tokens: 900 } },
  cost: { total_cost_usd: 21.09 },
  session_name: "kitty bar",
})

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe("buildSnapshot", () => {
  test("maps the session data into the agent-bar schema", () => {
    expect(buildSnapshot(data, "high", 1234)).toEqual({
      agent: "claude",
      model: "Opus 5.5 1M",
      effort: "high",
      context_pct: 37,
      context_tokens: 1000,
      cost_usd: 21.09,
      session_name: "kitty bar",
      updated_at: 1234,
    })
  })

  test("keeps effort null when unset", () => {
    expect(buildSnapshot(data, null, 0).effort).toBeNull()
  })
})

describe("exportAgentBar", () => {
  test("does nothing without AGENT_BAR_DIR", () => {
    exportAgentBar({ KITTY_WINDOW_ID: "7" }, data, null)
    expect(existsSync(TMP_DIR)).toBe(false)
  })

  test("does nothing outside kitty (no KITTY_WINDOW_ID)", () => {
    exportAgentBar({ AGENT_BAR_DIR: TMP_DIR }, data, null)
    expect(existsSync(TMP_DIR)).toBe(false)
  })

  test("writes <window id>.json with the snapshot", () => {
    exportAgentBar({ AGENT_BAR_DIR: TMP_DIR, KITTY_WINDOW_ID: "7" }, data, "max")
    const snap = JSON.parse(readFileSync(join(TMP_DIR, "7.json"), "utf8"))
    expect(snap.model).toBe("Opus 5.5 1M")
    expect(snap.effort).toBe("max")
  })

  test("leaves no temp files behind", () => {
    exportAgentBar({ AGENT_BAR_DIR: TMP_DIR, KITTY_WINDOW_ID: "7" }, data, null)
    expect(readdirSync(TMP_DIR)).toEqual(["7.json"])
  })

  test("keeps the directory and file private to the user", () => {
    exportAgentBar({ AGENT_BAR_DIR: TMP_DIR, KITTY_WINDOW_ID: "7" }, data, null)
    expect(statSync(TMP_DIR).mode & 0o777).toBe(0o700)
    expect(statSync(join(TMP_DIR, "7.json")).mode & 0o777).toBe(0o600)
  })

  test("ignores a window id that is not a number", () => {
    mkdirSync(TMP_DIR, { recursive: true })
    exportAgentBar({ AGENT_BAR_DIR: TMP_DIR, KITTY_WINDOW_ID: "../evil" }, data, null)
    expect(readdirSync(TMP_DIR)).toEqual([])
  })
})
