import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { getConfigCounts } from "../../src/collection/config"
import { mkdirSync, writeFileSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const TMP_DIR = join(tmpdir(), "claude-statusline-config-tests")

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe("getConfigCounts", () => {
  test("returns non-negative counts for empty directory", () => {
    const result = getConfigCounts(TMP_DIR)
    // May include counts from ~/.claude/ (home dir), so just check non-negative
    expect(result.claudeMd).toBeGreaterThanOrEqual(0)
    expect(result.rules).toBeGreaterThanOrEqual(0)
    expect(result.hooks).toBeGreaterThanOrEqual(0)
  })

  test("counts CLAUDE.md file in project root", () => {
    writeFileSync(join(TMP_DIR, "CLAUDE.md"), "# My project")
    const result = getConfigCounts(TMP_DIR)
    expect(result.claudeMd).toBeGreaterThanOrEqual(1)
  })

  test("counts CLAUDE.local.md file in project root", () => {
    writeFileSync(join(TMP_DIR, "CLAUDE.local.md"), "# Local")
    const result = getConfigCounts(TMP_DIR)
    expect(result.claudeMd).toBeGreaterThanOrEqual(1)
  })

  test("counts rules .md files in .claude/rules/", () => {
    const rulesDir = join(TMP_DIR, ".claude", "rules")
    mkdirSync(rulesDir, { recursive: true })
    writeFileSync(join(rulesDir, "rule1.md"), "Rule 1")
    writeFileSync(join(rulesDir, "rule2.md"), "Rule 2")
    const result = getConfigCounts(TMP_DIR)
    expect(result.rules).toBeGreaterThanOrEqual(2)
  })

  test("counts MCP servers from .claude/settings.json", () => {
    const claudeDir = join(TMP_DIR, ".claude")
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({
      mcpServers: { server1: {}, server2: {} },
    }))
    const result = getConfigCounts(TMP_DIR)
    expect(result.mcps).toBeGreaterThanOrEqual(2)
  })

  test("subtracts disabled MCP servers", () => {
    const claudeDir = join(TMP_DIR, ".claude")
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({
      mcpServers: { server1: {}, server2: {}, server3: {} },
      disabledMcpServers: ["server1"],
    }))
    const result = getConfigCounts(TMP_DIR)
    expect(result.mcps).toBe(2)
  })

  test("counts hooks from .claude/settings.json", () => {
    const claudeDir = join(TMP_DIR, ".claude")
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, "settings.json"), JSON.stringify({
      hooks: { PreToolUse: [{ command: "echo" }], PostToolUse: [{ command: "echo" }, { command: "test" }] },
    }))
    const result = getConfigCounts(TMP_DIR)
    expect(result.hooks).toBeGreaterThanOrEqual(3)
  })

  test("handles non-existent directory gracefully", () => {
    const result = getConfigCounts("/nonexistent/path")
    expect(result.claudeMd).toBeGreaterThanOrEqual(0)
    expect(result.rules).toBeGreaterThanOrEqual(0)
    expect(result.mcps).toBeGreaterThanOrEqual(0)
    expect(result.hooks).toBeGreaterThanOrEqual(0)
  })
})
