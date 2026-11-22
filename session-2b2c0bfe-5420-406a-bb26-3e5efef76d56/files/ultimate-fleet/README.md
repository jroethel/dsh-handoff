# ultimate-fleet kit

Deployment assets for a hub-and-spoke fleet of Ultimate instances: one **hub**
Ultimate (on the always-on VPS) that watches, delegates to, and reports on
**spoke** Ultimates (one per project, on the VPS and on the MacBook), with only
the hub's UI open in a browser.

```
ultimate-fleet/
├── INSTALL.md            ← START HERE: the guided install (checkpoints ✋)
├── DEPLOY.md             ← terse operational runbook (commands per stage)
├── wiring/               ← the roster + settings snippets (single source of truth)
│   ├── fleet.json            every project: machine, path, pinned port, purpose
│   ├── remotes.template.json the hub's ~/.ultimate/settings.json additions
│   └── tailscale.user-settings.json   every machine's user-settings additions
├── hub/                  ← the hub repo scaffold (deploy as its own git repo)
│   ├── AGENTS.md             the hub's charter (role, roster rules, etiquette)
│   ├── fleet.json            ← copy of wiring/fleet.json lives here at deploy time
│   ├── FIRST-PROMPT.md       day-one prompts (orient → smoke test → automation)
│   └── .ultimate/
│       ├── settings.json     enables tailscale for the hub project
│       ├── skills/fleet-sweep/SKILL.md     the standing sweep procedure
│       └── extensions/fleet/               the dashboard (server.ts + web.tsx)
├── darwin/fleet          ← macOS per-spoke launchd manager (one plist per spoke)
├── linux/                ← VPS: provision-vps.sh, ultimate@.service, enroll.sh
└── laptop/fleet-awake    ← caffeinate wrapper for fleet-alive sessions
```

## Decisions baked in (from the conversation that produced this kit)

- **Every project is its own Ultimate process** on its own pinned port; the hub
  is an ordinary project whose charter makes @ultimate the coordinator.
- **Hub lives on the VPS** — uptime is the hub's value; laptop spokes are
  reached over Tailscale when the Mac is awake and read as "asleep" when not.
- **Headless everywhere**: spokes run with `--no-open`; the hub's UI is the one
  browser tab (tailnet URL, or SSH tunnel).
- **Mixed local/remote spokes** work through Ultimate's resolution order:
  own storage → loopback → `remotes` user setting → cloud register. This kit
  fills the `remotes` layer; nothing is installed in spokes.
- **Cost control**: the hub's own cache stays warm because it never sleeps;
  laptop spokes pay a cold rewrite on their first message after waking —
  expected and noted in the charter.

## Prerequisites, per machine

| Machine | Needs |
|---|---|
| MacBook (laptop) | The Ultimate clone (`~/repos/ultimate`), `pnpm install` done in it, Node 26 + pnpm, Tailscale app logged in, Chrome |
| VPS | Ubuntu 24.04, a sudo user; `provision-vps.sh` installs git ≥ 2.54, Node 26, pnpm, Chrome, Tailscale, the clone, systemd unit |

Replace every `REPLACE-me` value in `wiring/*.json` before deploying anything.
