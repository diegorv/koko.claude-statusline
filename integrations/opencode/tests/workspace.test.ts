import { expect, test } from "bun:test"
import { createWorkspaceRequests, workspaceFor } from "../workspace.ts"

function server(branch: (directory: string, signal: AbortSignal) => Promise<string>) {
  const calls: { directory: string; signal?: AbortSignal | null }[] = []
  const client: Parameters<typeof createWorkspaceRequests>[0] = {
    vcs: {
      async get(input, options) {
        const directory = input?.location?.directory ?? ""
        calls.push({ directory, signal: options?.signal })
        const current = await branch(directory, options!.signal!)
        return { location: { directory }, data: { branch: { current } } }
      },
      async status(input, options) {
        const directory = input?.location?.directory ?? ""
        calls.push({ directory, signal: options?.signal })
        return { location: { directory }, data: [] }
      },
    },
    location: {
      async get(input, options) {
        const directory = input?.location?.directory ?? ""
        calls.push({ directory, signal: options?.signal })
        return { directory, project: { id: "project", directory: "/work/acme", canonical: "/work/acme" } }
      },
    },
  }
  return { client, calls }
}

test("uses the server's project root when a session opens in a subdirectory", async () => {
  const { client, calls } = server(async () => "main")
  const selection = { directory: "/work/acme/packages/web", sessionID: "one" }
  const result = await createWorkspaceRequests(client).load(selection)
  const workspace = workspaceFor(selection, result)
  expect(workspace.git).toMatchObject({ repo: "acme", branch: "main", dirty: false, staged: null, ahead: null })
  expect(workspace.worktrunk).toBeNull()
  expect(calls.map(call => call.directory)).toEqual(Array(3).fill(selection.directory))
  expect(calls.every(call => call.signal === calls[0].signal)).toBe(true)
})

test("hides the previous selection and rejects late replies after a session or directory switch", async () => {
  const late = Promise.withResolvers<string>()
  let queries = 0
  const { client, calls } = server(async () => ++queries === 2 ? late.promise : `branch-${queries}`)
  const requests = createWorkspaceRequests(client)
  const first = { directory: "/first", sessionID: "one" }
  const second = { directory: "/first", sessionID: "two" }
  const third = { directory: "/third", sessionID: "two" }
  const previous = await requests.load(first)
  const pending = requests.load(second)
  expect(workspaceFor(second, previous).git).toBeNull()
  const current = await requests.load(third)
  expect(calls[3].signal?.aborted).toBe(true)
  late.resolve("obsolete")
  const outdated = await pending
  expect(outdated.workspace.git).toBeNull()
  expect(workspaceFor(third, previous).git).toBeNull()
  expect(workspaceFor(third, outdated).git).toBeNull()
  expect(workspaceFor(third, current).git?.branch).toBe("branch-3")
})

test.each(["cancel", "timeout"])("%s aborts the server query and returns an empty workspace", async mode => {
  const { client, calls } = server((_directory, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true })
  }))
  const requests = createWorkspaceRequests(client, mode === "timeout" ? 5 : 4000)
  const selection = { directory: "/remote" }
  const pending = requests.load(selection)
  if (mode === "cancel") requests.cancel()
  const result = await pending
  expect(calls.every(call => call.signal?.aborted)).toBe(true)
  expect(calls[0].signal?.reason.name).toBe(mode === "timeout" ? "TimeoutError" : "AbortError")
  expect(workspaceFor(selection, result)).toEqual({ git: null, worktrunk: null })
})
