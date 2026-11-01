import { describe, expect, test } from "bun:test"
import { getGitInfo } from "../../src/collection/git.ts"

describe("getGitInfo", () => {
  test("returns valid info for current repo", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    expect(git.repo).toBe(cwd.split("/").pop() ?? "")
    expect(git.branch.length).toBeGreaterThan(0)
  })

  test("returns empty info for non-git directory", () => {
    const git = getGitInfo("/tmp")
    expect(git.repo).toBe("")
    expect(git.branch).toBe("")
    expect(git.dirty).toBe(false)
  })

  test("returns empty info for non-existent directory", () => {
    const git = getGitInfo("/nonexistent/path/that/does/not/exist")
    expect(git.repo).toBe("")
  })

  test("staged/modified/untracked are non-negative numbers", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    expect(git.staged).toBeGreaterThanOrEqual(0)
    expect(git.modified).toBeGreaterThanOrEqual(0)
    expect(git.untracked).toBeGreaterThanOrEqual(0)
  })

  test("ahead/behind are non-negative numbers", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    expect(git.ahead).toBeGreaterThanOrEqual(0)
    expect(git.behind).toBeGreaterThanOrEqual(0)
  })

  test("returns a short SHA for the current repo's HEAD", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    // Short SHAs are usually 7 chars but git auto-grows them when ambiguous;
    // accept anything between 7 and 12 alphanumeric chars.
    expect(git.sha).toMatch(/^[0-9a-f]{7,12}$/)
  })

  test("isFork is false for repos without an upstream remote", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    // The project itself has no `upstream` remote configured.
    expect(git.isFork).toBe(false)
  })

  test("non-git directories report sha empty and isFork false", () => {
    const git = getGitInfo("/tmp")
    expect(git.sha).toBe("")
    expect(git.isFork).toBe(false)
  })
})

describe("getGitInfo worktree detection", () => {
  const { mkdtempSync, rmSync } = require("node:fs") as typeof import("node:fs")
  const { spawnSync } = require("node:child_process") as typeof import("node:child_process")
  const { join } = require("node:path") as typeof import("node:path")
  const { tmpdir } = require("node:os") as typeof import("node:os")

  const git = (cwd: string, ...args: string[]) =>
    spawnSync("git", ["-C", cwd, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { stdio: "ignore" })

  test("main checkout has empty worktree; linked worktree reports its folder name", () => {
    const root = mkdtempSync(join(tmpdir(), "sl-wt-"))
    try {
      const main = join(root, "repo")
      git(root, "init", "-q", "-b", "main", main)
      git(main, "commit", "-q", "--allow-empty", "-m", "init")
      const linked = join(root, "repo.feature")
      git(main, "worktree", "add", "-q", "-b", "feature", linked)

      expect(getGitInfo(main).worktree).toBe("")
      const info = getGitInfo(linked)
      expect(info.worktree).toBe("repo.feature")
      expect(info.branch).toBe("feature")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
