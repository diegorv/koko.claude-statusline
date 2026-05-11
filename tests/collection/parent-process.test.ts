import { describe, expect, test } from "bun:test"
import { detectSkipPermissions } from "../../src/collection/parent-process"

// These tests exercise the real platform shell-out rather than mocking. The
// parent of the test process is `bun test`, which is never launched with the
// dangerous flag — so detection should reliably return false in CI/local
// runs. Errors must not throw; the function returns false on any failure.

describe("detectSkipPermissions", () => {
  test("returns false in the test runner (parent has no skip flag)", () => {
    expect(detectSkipPermissions()).toBe(false)
  })

  test("does not throw on repeated invocations", () => {
    // Re-entrant safety: each call spawns a fresh ps; making sure that
    // mode of operation is stable even when invoked several times in a row.
    expect(() => {
      detectSkipPermissions()
      detectSkipPermissions()
      detectSkipPermissions()
    }).not.toThrow()
  })
})
