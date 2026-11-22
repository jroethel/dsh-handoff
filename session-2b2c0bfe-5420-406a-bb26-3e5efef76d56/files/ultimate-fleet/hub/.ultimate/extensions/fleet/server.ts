import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineExtension } from '@earendil-works/pi-durable'

/**
 * Fleet dashboard: poll the `status` action of every spoke in the roster
 * (`fleet.json` at the hub repo's root) and serve one aggregated overview to
 * the web panel. Same shape as the projects extension's loopback polling:
 * server-to-server POST with the target's own origin as the Origin header.
 *
 * v0 works for every roster entry whose machine equals the hub's machine
 * (loopback) and for tailnet entries through the machine's Tailscale DNS name
 * — the hub machine's tailnet login must be in each such spoke's
 * `tailscale.allow`.
 */

type RosterProject = {
  name: string
  machine: string
  path?: string
  port?: number
  kind?: string
}

type Roster = {
  hub?: { machine?: string; project?: string }
  machines?: Record<string, { dns?: string; clone?: string; kind?: string }>
  projects?: RosterProject[]
}

type EntryState = 'ok' | 'asleep' | 'unreachable' | 'refused' | 'error'

type Entry = {
  name: string
  machine: string
  kind?: string
  url: string
  state: EntryState
  status?: {
    busy?: number
    generation?: number
    questions?: { count?: number }
    failures?: { count?: number }
    head?: { behind?: number; ahead?: number }
    providers?: { provider: string; state: string }[]
  }
  error?: string
}

type Overview = {
  at: number
  hubMachine?: string
  entries: Entry[]
}

const STATUS_TIMEOUT_MS = 3_000

function readRoster(projectRoot: string): Roster {
  try {
    const parsed = JSON.parse(readFileSync(join(projectRoot, 'fleet.json'), 'utf8')) as Roster
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function urlOf(entry: RosterProject, roster: Roster): string | undefined {
  const hubMachine = roster.hub?.machine
  if (entry.machine === hubMachine && entry.port !== undefined) return `http://127.0.0.1:${entry.port}`
  const dns = entry.machine === undefined ? undefined : roster.machines?.[entry.machine]?.dns
  if (dns === undefined || entry.port === undefined) return undefined
  return `https://${dns}:${entry.port}`
}

function classify(error: unknown): { state: EntryState; error: string } {
  const text = String(error)
  const cause = (error as { cause?: { code?: string } } | undefined)?.cause?.code
  if (cause === 'ECONNREFUSED' || cause === 'EHOSTUNREACH') return { state: 'asleep', error: cause }
  if (cause === 'ENOTFOUND' || cause === 'EAI_AGAIN') return { state: 'unreachable', error: cause }
  if (text.includes('timeout') || text.includes('abort')) return { state: 'unreachable', error: 'timeout' }
  return { state: 'error', error: text.slice(0, 200) }
}

async function postStatus(url: string): Promise<{ status: Entry['status'] } | { failed: { state: EntryState; error: string } }> {
  const origin = new URL(url).origin
  const response = await fetch(`${url}/api/extensions/status/actions/status`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ args: {} }),
    signal: AbortSignal.any([AbortSignal.timeout(STATUS_TIMEOUT_MS)]),
  })
  const text = await response.text()
  if (response.status === 403) return { failed: { state: 'refused', error: '403: hub login not in spokes tailscale.allow' } }
  if (!response.ok) return { failed: { state: 'error', error: `HTTP ${response.status}` } }
  const body = JSON.parse(text) as { result?: Entry['status'] }
  return { status: body.result }
}

async function overview(_args: unknown, ctx: { host: { projectRoot: string } }): Promise<Overview> {
  const roster = readRoster(ctx.host.projectRoot)
  const hubMachine = roster.hub?.machine
  const projects = Array.isArray(roster.projects) ? roster.projects : []
  const entries = await Promise.all(
    projects.map(async (project): Promise<Entry> => {
      const base: Entry = {
        name: project.name,
        machine: project.machine,
        kind: project.kind,
        url: urlOf(project, roster) ?? 'unknown',
        state: 'error',
      }
      if (base.url === 'unknown') {
        return { ...base, error: 'no port or machine DNS in the roster' }
      }
      try {
        const outcome = await postStatus(base.url)
        if ('failed' in outcome) return { ...base, ...outcome.failed }
        return { ...base, state: 'ok', status: outcome.status }
      } catch (error: unknown) {
        return { ...base, ...classify(error) }
      }
    }),
  )
  return { at: Date.now(), hubMachine, entries }
}

export default defineExtension({ name: 'fleet' })

export const actions = {
  overview,
}
