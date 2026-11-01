import { describe, expect, test } from "bun:test"
import { renderGitStatus } from "../../../src/ui/components/git-status.ts"
import type { GitInfo } from "../../../src/collection/git.ts"

const BASE: GitInfo = {
  repo: "myrepo", branch: "main", dirty: false,
  staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0,
  sha: "", isFork: false, worktree: "",
}

describe("renderGitStatus", () => {
  test("returns empty string for empty repo", () => {
    expect(renderGitStatus({ ...BASE, repo: "", branch: "" })).toBe("")
  })

  test("renders clean branch", () => {
    const result = renderGitStatus(BASE)
    expect(result).toContain("main")
    expect(result).not.toContain("*")
  })

  test("renders dirty branch with asterisk", () => {
    const result = renderGitStatus({
      ...BASE, branch: "feat", dirty: true, staged: 1, modified: 2, untracked: 3,
    })
    expect(result).toContain("feat")
    expect(result).toContain("*")
    expect(result).toContain("+1")
    expect(result).toContain("~2")
    expect(result).toContain("?3")
  })

  test("renders ahead/behind counts", () => {
    const result = renderGitStatus({ ...BASE, ahead: 3, behind: 1 })
    expect(result).toContain("↑3")
    expect(result).toContain("↓1")
  })

  test("renders short SHA when present", () => {
    const result = renderGitStatus({ ...BASE, sha: "abc1234" })
    expect(result).toContain("abc1234")
  })

  test("omits the SHA tail when empty", () => {
    expect(renderGitStatus(BASE)).not.toContain("⑂")  // sanity: no fork on base
  })

  test("renders fork marker when isFork is true", () => {
    const result = renderGitStatus({ ...BASE, isFork: true })
    expect(result).toContain("⑂")
  })

  test("hides fork marker when isFork is false", () => {
    expect(renderGitStatus(BASE)).not.toContain("⑂")
  })
})

describe("renderGitStatus with worktrunk info", () => {
  test("renders agent marker and ahead/behind vs default branch", () => {
    const result = renderGitStatus(BASE, { marker: "🤖", ahead: 2, behind: 1, defaultBranch: "main" }).replace(/\x1b\[[0-9;]*m/g, "")
    expect(result).toContain("🤖")
    expect(result).toContain("main↑2")
    expect(result).toContain("↓1")
  })

  test("omits default-branch sync when in step with it", () => {
    const result = renderGitStatus(BASE, { marker: "", ahead: 0, behind: 0, defaultBranch: "main" })
    expect(result).not.toContain("main↑")
    expect(result).not.toContain("↓")
  })
})
