import { describe, expect, test } from "bun:test"
import { getGitInfo } from "../../src/collection/git"

describe("getGitInfo", () => {
  test("returns valid info for current repo", () => {
    const cwd = import.meta.dir.replace(/\/tests\/collection$/, "")
    const git = getGitInfo(cwd)
    expect(git.repo).toBe("claude-statusline")
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
})
