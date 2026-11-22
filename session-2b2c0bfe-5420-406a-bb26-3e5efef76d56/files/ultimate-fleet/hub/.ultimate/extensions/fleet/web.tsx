import { useEffect, useState } from 'react'
import { ActivityIcon, RefreshCwIcon } from 'lucide-react'
import { actionRef, api, defineWebExtension } from '@/sdk'

/**
 * Fleet panel: the hub's right-panel tab. Polls the fleet extension's
 * `overview` action (server-side, so cross-machine calls carry the right
 * Origin) and renders one row per spoke.
 */

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

type Overview = { at: number; hubMachine?: string; entries: Entry[] }

const OverviewAction = actionRef<undefined, Overview>('fleet', 'overview')

const POLL_MS = 30_000

const STATE_DOT: Record<EntryState, string> = {
  ok: 'bg-emerald-500',
  asleep: 'bg-neutral-400',
  unreachable: 'bg-neutral-400',
  refused: 'bg-amber-500',
  error: 'bg-red-500',
}

const STATE_LABEL: Record<EntryState, string> = {
  ok: 'healthy',
  asleep: 'asleep',
  unreachable: 'unreachable',
  refused: 'refused 403',
  error: 'error',
}

function Row({ entry }: { entry: Entry }) {
  const status = entry.state === 'ok' ? entry.status : undefined
  const questions = status?.questions?.count ?? 0
  const failures = status?.failures?.length ?? 0
  const head = status?.head
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-3 py-2 text-sm">
      <span className={`size-2 shrink-0 rounded-full ${STATE_DOT[entry.state]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium">{entry.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{entry.machine}</span>
        </div>
        {entry.state !== 'ok' && entry.error !== undefined && (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{entry.error}</div>
        )}
        {status !== undefined && (questions > 0 || failures > 0) && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            {questions > 0 && <span>{questions} question{questions === 1 ? '' : 's'} for you </span>}
            {failures > 0 && <span>{failures} failure{failures === 1 ? '' : 's'}</span>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted-foreground">
        {(status?.busy ?? 0) > 0 && <span className="text-foreground">{status?.busy} busy</span>}
        {head !== undefined && (head.behind ?? 0) + (head.ahead ?? 0) > 0 && (
          <span>
            {head.behind !== undefined && head.behind > 0 ? `↓${head.behind}` : ''}
            {head.ahead !== undefined && head.ahead > 0 ? `↑${head.ahead}` : ''}
          </span>
        )}
        <span>{STATE_LABEL[entry.state]}</span>
      </div>
    </div>
  )
}

function FleetPanel() {
  const [overview, setOverview] = useState<Overview>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    api
      .action(OverviewAction, undefined)
      .then((value) => {
        setOverview(value)
        setError(undefined)
      })
      .catch((cause: unknown) => setError(String(cause).slice(0, 300)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  const entries = [...(overview?.entries ?? [])].sort((a, b) => {
    const rank = (entry: Entry) => (entry.state === 'ok' ? (entry.status?.questions?.count ?? 0) > 0 ? 0 : 1 : 0)
    return rank(a) - rank(b)
  })
  const healthy = entries.filter((entry) => entry.state === 'ok').length
  const needYou = entries.filter((entry) => (entry.status?.questions?.count ?? 0) > 0).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {needYou > 0 ? `${needYou} for you · ` : ''}
          {healthy}/{entries.length} healthy
        </span>
        <button
          type="button"
          onClick={refresh}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Refresh now"
        >
          <RefreshCwIcon className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((entry) => (
          <Row key={`${entry.machine}/${entry.name}`} entry={entry} />
        ))}
        {entries.length === 0 && !error && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No roster entries. Put fleet.json at this repo's root.
          </div>
        )}
        {error !== undefined && (
          <div className="px-3 py-6 text-center text-xs text-red-500">{error}</div>
        )}
      </div>
      {overview?.at !== undefined && (
        <div className="flex items-center gap-1.5 border-t border-border/60 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <ActivityIcon className="size-3" aria-hidden />
          polled {new Date(overview.at).toLocaleTimeString()} · every 30s
        </div>
      )}
    </div>
  )
}

export default defineWebExtension({
  panels: [{ id: 'fleet', title: 'Fleet', icon: ActivityIcon, component: FleetPanel }],
})
