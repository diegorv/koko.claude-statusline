import { describe, expect, test } from "bun:test"
import { parseWorktrunkList } from "../../src/collection/worktrunk.ts"

const json = (items: unknown[]) => JSON.stringify({ schema: 2, items })

describe("parseWorktrunkList", () => {
  test("reads marker and default-branch ahead/behind of the current worktree", () => {
    const out = json([
      { branch: "main", worktree: { current: false }, marker: "💬" },
      {
        branch: "feat", worktree: { current: true }, marker: "🤖",
        default_branch: { ahead: 3, behind: 1 },
      },
    ])
    expect(parseWorktrunkList(JSON.stringify({ ...JSON.parse(out), repo: { default_branch: "main" } }))).toEqual({ marker: "🤖", ahead: 3, behind: 1, defaultBranch: "main" })
  })

  test("missing marker and default_branch fall back to empty/zero", () => {
    const out = json([{ branch: "feat", worktree: { current: true } }])
    expect(parseWorktrunkList(out)).toEqual({ marker: "", ahead: 0, behind: 0, defaultBranch: "" })
  })

  test("uses repo.default_branch from the envelope", () => {
    const out = JSON.stringify({
      schema: 2, repo: { default_branch: "trunk" },
      items: [{ branch: "feat", worktree: { current: true }, default_branch: { ahead: 1, behind: 0 } }],
    })
    expect(parseWorktrunkList(out)?.defaultBranch).toBe("trunk")
  })

  test("returns null when no item is current or output is invalid", () => {
    expect(parseWorktrunkList(json([{ branch: "x", worktree: { current: false } }]))).toBeNull()
    expect(parseWorktrunkList("not json")).toBeNull()
    expect(parseWorktrunkList("")).toBeNull()
  })
})
