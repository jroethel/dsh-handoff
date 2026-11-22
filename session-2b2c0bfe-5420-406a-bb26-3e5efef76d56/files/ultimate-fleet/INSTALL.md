# INSTALL.md — the guided install

This guide follows the conversation that designed the fleet: Ultimate's
architecture → the hub-and-spoke decision → headless deployment → Tailscale
reach → the assets in this kit. **It is checkpointed: do one ✋ checkpoint at a
time, and come back to the chat (say "next") when its check passes.**

Execution locations are explicit in every step: **[laptop]** = your MacBook,
**[VPS]** = the Ubuntu box. `KIT` = this directory (`~/ultimate-fleet` after
Stage 0). Read `README.md` first for the map.

## Why this shape (30-second recap of the conversation)

- Every project is **its own Ultimate process** on a pinned port; there is no
  multi-project server. A "hub" is an ordinary project whose `AGENTS.md`
  charter turns its @ultimate into the fleet coordinator.
- The hub reaches spokes through Ultimate's resolution order: own storage →
  **loopback** (same machine) → **`remotes` user setting** (other machines,
  Tailscale HTTPS) → cloud register. Spokes need nothing installed.
- The hub lives on the **VPS** because the hub's value is uptime (sweeps,
  keep-warm, watchdog); the MacBook is a spoke that is **asleep** when the lid
  is shut — a normal state, not an incident.
- Everything runs headless (`--no-open`); your one browser tab is the hub's UI
  at `https://<vps>:4747` over Tailscale.

## Before you start

| Machine | Must already exist |
|---|---|
| laptop | Ultimate clone at `~/repos/ultimate` with `pnpm install` done; Node 26 + pnpm (you have these — the kit was built against them) |
| VPS | Ubuntu 24.04, sudo user, SSH access |

---

### ✋ Checkpoint 0 — fill the roster  [laptop, `KIT/wiring/`]

1. Edit `fleet.json`: replace every `REPLACE-me` (paths, user names, Tailscale
   DNS names — the DNS names can wait until Checkpoints 1/3 tell you them).
2. Adjust the project list to your real fleet; keep one unique port per
   project per machine; keep the `fleet` entry (the hub, machine vps).
3. Skim `hub/AGENTS.md` — the charter is the hub's brain. Edit its roster rules
   or etiquette if you disagree; prose is the deployment here.

**Check:** `grep -n REPLACE-me KIT/wiring/*.json` shows only DNS names you
genuinely don't know yet.
**Say "next" when done.**

---

### ✋ Checkpoint 1 — provision the VPS  [VPS, after `scp -r KIT user@vps:~/fleet-kit`]

1. `cd ~/fleet-kit/linux && FLEET_TAILSCALE_ALLOW=you@example.com ./provision-vps.sh`
   (installs git ≥ 2.54, Node 26, pnpm, Chrome, Tailscale, clones Ultimate,
   renders the `ultimate@.service` unit, writes user settings).
2. By hand, when it prints them: `sudo tailscale up` (auth URL), then
   `sudo tailscale set --operator=$USER`, then enable **HTTPS certificates** in
   the Tailscale admin console, then `sudo loginctl enable-linger $USER`.
3. Put the machine's DNS name into **both** copies of `fleet.json`
   (`machines.vps.dns`) — VPS copy and laptop copy.

**Check:** `tailscale status` works; `ultimate --help` prints usage;
`systemctl --user list-unit-files 'ultimate@*'` shows the rendered template.
**Say "next".**

---

### ✋ Checkpoint 2 — deploy the hub repo  [VPS]

1. Follow **DEPLOY.md → Stage 2** exactly (git init, copy `hub/` + roster,
   `enroll.sh fleet`).
2. Open `https://<vps dns>:4747` in your laptop browser.
3. First-run page: log in to a provider (⌘K → Log in to a provider). Approve
   the hub project's `.ultimate/` setup when the trust card asks.

**Check:** the hub's conversation answers; the status line shows the tailnet
chip green; the Extensions tab lists `fleet` without an error (if its card
shows a build error, that is the honest state of kit code meeting the live
clone — paste the error to @ultimate and let it fix its own extension).
**Say "next".**

---

### ✋ Checkpoint 3 — smoke-test the hub→spoke path  [your browser, hub UI]

1. Paste **Prompt 1** from `hub/FIRST-PROMPT.md` (orient). It should read the
   charter + roster and answer in five lines.
2. Paste **Prompt 2** (the sweep). Laptop spokes will read "asleep" if the lid
   is shut — that's correct. A `403` on any VPS spoke means wiring: the hub's
   tailnet login belongs in that machine's `tailscale.allow` (user settings).

**Check:** the sweep report ends with a counts line and names loopback vs
tailnet per spoke.
**Say "next".**

---

### ✋ Checkpoint 4 — enroll the VPS spokes  [VPS]

For each roster `machine: vps` project: clone it to `~/fleet-work/<name>`, then
`~/fleet-kit/linux/enroll.sh <name>`.

**Check:** each ends "healthy on 127.0.0.1:<port>"; the Fleet panel shows them
green.
**Say "next".**

---

### ✋ Checkpoint 5 — laptop spokes  [laptop]

1. `cd ~/repos/ultimate && pnpm add -g "$PWD"` (once).
2. Merge `wiring/tailscale.user-settings.json` into `~/.ultimate/settings.json`
   (your login in `tailscale.allow`), with Tailscale the app logged in.
3. `cd ~/ultimate-fleet && ./darwin/fleet install && ./darwin/fleet status`.

**Check:** `running · api ok` per spoke; `./darwin/fleet open my-app` summons a
Chrome window onto the running spoke; `./darwin/fleet remotes` prints the JSON
for the next checkpoint.
**Say "next".**

---

### ✋ Checkpoint 6 — wire laptop spokes into the hub  [VPS edit]

Merge `fleet remotes` output into the **VPS** `~/.ultimate/settings.json`
(the `remotes` key). Settings changes reload live.

**Check:** hub sweep now reports laptop spokes **asleep** (lid shut) or
**healthy** (lid open, `./darwin/fleet` running) — with no 403s.
**Say "next".**

---

### ✋ Checkpoint 7 — make it standing  [your browser, hub UI]

1. Paste **Prompt 3** from `FIRST-PROMPT.md`: create the 9am weekday sweep
   automation, subscriber @ultimate.
2. Optional: ask @ultimate to review `AGENTS.md` and `fleet.json` for anything
   stale, and to harden the Fleet panel (it owns that code now).

**Check:** the automation's next fire time is confirmed. Done — the fleet is
deployed. Lid-closing now costs nothing but a cold rewrite of any *laptop*
spoke that you message first after waking; the hub itself stays warm.

---

## When something doesn't match this guide

The repo is the truth, not the kit: `~/repos/ultimate/README.md` ("One Ultimate
or many"), `docs/running.md`, `extensions/{projects,status,tailscale,messages,
codemode,automations}/README.md`. If Ultimate changed under the kit, ask the
hub's @ultimate to re-check the kit against its own code — it can diff its
clone and propose patches to this repo.
