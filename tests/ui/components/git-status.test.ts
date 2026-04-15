import { describe, expect, test } from "bun:test"
import { renderGitStatus } from "../../../src/ui/components/git-status"
import type { GitInfo } from "../../../src/collection/git"

describe("renderGitStatus", () => {
  test("returns empty string for empty repo", () => {
    const git: GitInfo = { repo: "", branch: "", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 }
    expect(renderGitStatus(git)).toBe("")
  })

  test("renders clean branch", () => {
    const git: GitInfo = { repo: "myrepo", branch: "main", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 }
    const result = renderGitStatus(git)
    expect(result).toContain("main")
    expect(result).not.toContain("*")
  })

  test("renders dirty branch with asterisk", () => {
    const git: GitInfo = { repo: "myrepo", branch: "feat", dirty: true, staged: 1, modified: 2, untracked: 3, ahead: 0, behind: 0 }
    const result = renderGitStatus(git)
    expect(result).toContain("feat")
    expect(result).toContain("*")
    expect(result).toContain("+1")
    expect(result).toContain("~2")
    expect(result).toContain("?3")
  })

  test("renders ahead/behind counts", () => {
    const git: GitInfo = { repo: "myrepo", branch: "main", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 3, behind: 1 }
    const result = renderGitStatus(git)
    expect(result).toContain("↑3")
    expect(result).toContain("↓1")
  })
})
