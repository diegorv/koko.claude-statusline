import type { Plugin } from "@opencode/plugin/tui"
import { EMPTY_WORKSPACE, type WorkspaceSnapshot } from "../../src/core/workspace.ts"
import { mapOpenCodeGit } from "./mapping/git.ts"

type Client = Plugin.Context["client"]
type WorkspaceClient = { vcs: Pick<Client["vcs"], "get" | "status">; location: Pick<Client["location"], "get"> }
type Selection = { directory: string; sessionID?: string }
type Response = { selection: Selection; workspace: WorkspaceSnapshot }

/** Solid retains the last resource value while loading a new selection. */
export function workspaceFor(selection: Selection, response?: Response): WorkspaceSnapshot {
  return response?.selection === selection ? response.workspace : EMPTY_WORKSPACE
}

/** Each mounted panel queries the connected server for its current selection. */
export function createWorkspaceRequests(client: WorkspaceClient, timeoutMs = 4000) {
  let active: AbortController | undefined
  const cancel = () => active?.abort()

  async function load(selection: Selection): Promise<Response> {
    cancel()
    active = new AbortController()
    const signal = AbortSignal.any([active.signal, AbortSignal.timeout(timeoutMs)])
    const input = { location: { directory: selection.directory } }
    try {
      const [info, status, project] = await Promise.all([
        client.vcs.get(input, { signal }),
        client.vcs.status(input, { signal }),
        client.location.get(input, { signal }),
      ])
      signal.throwIfAborted()
      const git = mapOpenCodeGit(project.project.directory, info.data.branch.current, status.data.length > 0)
      return { selection, workspace: { git, worktrunk: null } }
    } catch {
      return { selection, workspace: EMPTY_WORKSPACE }
    }
  }

  return { load, cancel }
}
