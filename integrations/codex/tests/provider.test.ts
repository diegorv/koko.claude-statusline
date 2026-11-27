import { expect, test } from "bun:test"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import { resourceUri } from "../protocol.ts"

const entry = new URL("../server.ts", import.meta.url)
const request = (id: string | number, method: string, params?: unknown) => JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
const read = (id: number, thread: unknown) => request(id, "resources/read", {
  uri: resourceUri, _meta: { "com.openai/codex-statusline-state": { thread } },
})

test("serves discovery and isolated, bounded reads while stdin stays open", async () => {
  const child = spawn(process.execPath, [fileURLToPath(entry)], { stdio: ["pipe", "pipe", "pipe"] })
  const exited = once(child, "exit")
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
  const next = async () => {
    const { value, done } = await lines.next()
    if (done) throw new Error("unexpected EOF")
    return JSON.parse(value)
  }
  const stderr: Buffer[] = []
  child.stderr.on("data", chunk => stderr.push(chunk))
  try {
    child.stdin.write(request(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "fixture", version: "1" } }))
    expect((await next()).result).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {} }, serverInfo: { name: "koko-statusline" } })
    child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n' + request("tools", "tools/list") + request(3, "resources/list"))
    const listed = await next()
    expect(listed.id).toBe("tools")
    expect(listed.result.tools).toHaveLength(1)
    expect(listed.result.tools[0]).toMatchObject({ name: "statusline", title: "Koko", _meta: { "openai/ui": { entrypoints: [{ type: "statusline", resourceUri }] } } })
    expect((await next()).result.resources).toEqual([{ name: "footer", uri: resourceUri, mimeType: "application/json" }])

    let id = 4
    for (const name of ["red", "blue", "red"]) {
      const frame = Buffer.from(read(id, { id: name, name: "Fix 📦 " + name, model: { display_name: "\x1b[31mModel-" + name + "\x1b[0m", reasoning_level: "high" },
        agent: { state: "ready" }, workspace: { cwd: "/same" } }))
      const split = frame.indexOf(Buffer.from("📦")) + 1
      child.stdin.write(frame.subarray(0, split))
      await Bun.sleep(5)
      const start = performance.now()
      child.stdin.write(frame.subarray(split))
      const response = await next()
      expect(performance.now() - start).toBeLessThan(1000)
      expect(response.id).toBe(id++)
      expect(response.result.contents).toHaveLength(1)
      const [resource] = response.result.contents
      expect(resource).toMatchObject({ uri: resourceUri, mimeType: "application/json" })
      const tree = JSON.parse(resource.text)
      expect(tree).toMatchObject({ type: "row", props: { gap: 1, wrap: "wrap" } })
      expect(tree.children.map((group: { children: { children: string[] }[] }) => group.children.flatMap(s => s.children).join("")))
        .toEqual(["Model-" + name, "effort: high", "ready", "Fix 📦 " + name])
    }
    child.stdin.write(read(id, { id: "new", workspace: { cwd: "/same" } }))
    expect((await next()).result.contents[0].text).not.toContain("Model-")
    child.stdin.write(read(++id, {}))
    expect((await next()).result.contents[0].text).toBe("null")

    child.stdin.write("not-json\n[]\n" + request(10, "resources/read", { uri: "ui://wrong" }) + request(11, "unknown"))
    for (const [id, code] of [[null, -32700], [null, -32600], [10, -32602], [11, -32601]]) {
      expect(await next()).toMatchObject({ jsonrpc: "2.0", id, error: { code } })
    }
    child.stdin.write("a".repeat(1024 * 1024 + 1) + "\n" + request(12, "ping"))
    expect((await next()).error.code).toBe(-32600)
    expect(await next()).toEqual({ jsonrpc: "2.0", id: 12, result: {} })
    child.stdin.end()
    expect((await exited)[0]).toBe(0)
    expect((await lines.next()).done).toBe(true)
    expect(Buffer.concat(stderr).length).toBe(0)
  } finally {
    child.kill()
  }
})
