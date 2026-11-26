import { expect, test } from "bun:test"
import { fetchWorkspace } from "../workspace.ts"

test("uses the server's project root when a session opens in a subdirectory", async () => {
  const controller = new AbortController()
  const received: string[] = []
  const workspace = await fetchWorkspace({
    vcs: {
      async get(input, options) { received.push(input?.location?.directory ?? ""); expect(options?.signal).toBe(controller.signal); return { location: { directory: "/work/acme/packages/web" }, data: { branch: { current: "main" } } } },
      async status(input, options) { received.push(input?.location?.directory ?? ""); expect(options?.signal).toBe(controller.signal); return { location: { directory: "/work/acme/packages/web" }, data: [] } },
    },
    location: {
      async get(input, options) { received.push(input?.location?.directory ?? ""); expect(options?.signal).toBe(controller.signal); return { directory: "/work/acme/packages/web", project: { id: "project", directory: "/work/acme", canonical: "/work/acme" } } },
    },
  }, "/work/acme/packages/web", controller.signal)
  expect(workspace.directory).toBe("/work/acme/packages/web")
  expect(workspace.git?.repo).toBe("acme")
  expect(received).toEqual(Array(3).fill("/work/acme/packages/web"))
})
