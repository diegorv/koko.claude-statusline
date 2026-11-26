import { expect, test } from "bun:test"

test("resizing a measured slot updates only presentation in the client Solid runtime", () => {
  // The test runner selects Solid's server export by default. Run the component's
  // reactive composition with the same client primitives used by OpenTUI.
  const child = Bun.spawnSync([process.execPath, "--conditions=browser", import.meta.dir + "/panel-scenario.ts"], {
    env: { ...process.env, KOKO_STATUSLINE_RIGHT_MARGIN: "5", CLAUDE_STATUSLINE_RIGHT_MARGIN: "10" },
  })
  expect(child.stderr.toString()).toBe("")
  expect(child.exitCode).toBe(0)
})
