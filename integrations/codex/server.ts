import { WorkspaceCache } from "./workspace.ts"
import { once } from "node:events"
import { error, reply } from "./protocol.ts"

// Keep a partial request between writes. An oversized frame is discarded through its newline.
const maxFrame = 1024 * 1024
const workspaces = new WorkspaceCache()
async function serve() {
  const frame = Buffer.allocUnsafe(maxFrame)
  const utf8 = new TextDecoder("utf-8", { fatal: true })
  let length = 0
  let overflow = false
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk)
    let start = 0
    while (start < bytes.length) {
      const newline = bytes.indexOf(10, start)
      const end = newline === -1 ? bytes.length : newline
      if (length + end - start > maxFrame) overflow = true
      if (!overflow) length += bytes.copy(frame, length, start, end)
      if (newline === -1) break
      let response
      if (overflow) {
        response = error(null, -32600, "Request exceeds 1 MiB")
      } else {
        let line: string | undefined
        try {
          line = utf8.decode(frame.subarray(0, length))
        } catch {
          response = error(null, -32700, "Invalid UTF-8")
        }
        if (line !== undefined) response = reply(line, workspaces)
      }
      if (response && !process.stdout.write(JSON.stringify(response) + "\n")) await once(process.stdout, "drain")
      length = 0
      overflow = false
      start = newline + 1
    }
  }
}

function terminate() {
  workspaces.close()
  process.stdin.destroy()
}
process.once("SIGTERM", terminate)
process.once("SIGINT", terminate)

serve().finally(() => workspaces.close()).catch(cause => {
  console.error("Koko statusline stopped:", cause instanceof Error ? cause.message : "stdio failure")
  process.exitCode = 1
})
