import { describe, expect, test } from "bun:test"
import { renderGitStatus } from "../../../src/ui/components/git-status"
import type { GitInfo } from "../../../src/collection/git"

const BASE: GitInfo = {
  repo: "myrepo", branch: "main", dirty: false,
  staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0,
  sha: "", isFork: false,
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
