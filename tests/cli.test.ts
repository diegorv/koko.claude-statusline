import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const entry = new URL("../src/index.ts", import.meta.url).pathname
function run(input: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [entry, ...args], {
    input, encoding: "utf8",
    env: { ...process.env, PANE_HEADER_DIR: "", CLAUDE_STATUSLINE_DEBUG_LOG: "", KOKO_STATUSLINE_DEBUG_LOG: "", ...env },
  })
}

describe("statusline CLI", () => {
  test("retains the existing Claude command", () => {
    const result = run(JSON.stringify({ model: { display_name: "Opus" }, cost: { total_cost_usd: 1.5 } }))
    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("Opus")
    expect(result.stdout).toContain("$1.50")
  })

  test("auto-detects Antigravity and exports its identity to the pane header", () => {
    const dir = mkdtempSync(join(tmpdir(), "koko-cli-"))
    try {
      const result = run(JSON.stringify({ product: "antigravity", model: { display_name: "Gemini", effort: "medium" }, cost: { total_usd: 2.5 } }), [], { PANE_HEADER_DIR: dir, KITTY_WINDOW_ID: "7" })
      expect(result.status).toBe(0)
      expect(result.stderr).toBe("")
      expect(result.stdout).toContain("Gemini")
      expect(result.stdout).toContain("~$2.50")
      const snapshot = JSON.parse(readFileSync(join(dir, "7.json"), "utf8"))
      expect(snapshot.agent).toBe("antigravity")
      expect(snapshot.effort).toBe("medium")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("supports explicit Antigravity selection without product metadata", () => {
    const result = run('{"model":{"display_name":"Gemini"}}', ["--agent", "antigravity"])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Gemini")
    expect(result.stdout).not.toContain("¢")
  })

  test("does not display unknown Claude cost as a reported zero", () => {
    const result = run("{}")
    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain("¢")
    expect(result.stdout).not.toContain("$")
  })

  test("distinguishes Antigravity conversations with identical transcript filenames", () => {
    const dir = mkdtempSync(join(tmpdir(), "koko-debug-"))
    try {
      const log = join(dir, "debug.jsonl")
      for (const id of ["aaaaaaaa-session", "bbbbbbbb-session"]) {
        const result = run(JSON.stringify({ product: "antigravity", conversation_id: id, transcript_path: `/brain/${id}/logs/transcript.jsonl` }), [], { KOKO_STATUSLINE_DEBUG_LOG: log })
        expect(result.status).toBe(0)
      }
      const records = readFileSync(log, "utf8").trim().split("\n").map(line => JSON.parse(line))
      expect(records.map(record => record.sid)).toEqual(["aaaaaaaa", "bbbbbbbb"])
      expect(records.map(record => record.agent)).toEqual(["antigravity", "antigravity"])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("invalid stdin is silent and unsupported selection is actionable on stderr", () => {
    for (const input of ["", "not json", "null", "[]", "42", '"text"']) {
      const result = run(input)
      expect(result.status).toBe(0)
      expect(result.stdout).toBe("")
      expect(result.stderr).toBe("")
    }
    for (const input of ["{}", ""]) {
      const result = run(input, ["--agent", "codex"])
      expect(result.status).toBe(1)
      expect(result.stdout).toBe("")
      expect(result.stderr).toContain("Supported agents: claude, antigravity")
    }
  })
})
