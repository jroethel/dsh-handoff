# DEPLOY.md — operational runbook

Every step says **which machine** it runs on and from **where**. Do stages in
order; each ends with a verifiable check. `KIT` = this directory, wherever you
keep it (examples assume `~/ultimate-fleet` on both machines).

---

## Stage 0 — fill the roster  *(laptop, in the kit)*

1. Edit `wiring/fleet.json`: replace every `REPLACE-me`. Machine DNS names come
   from `tailscale status --json | jq -r .Self.DNSName` (drop the trailing
   dot) — fill them in Stage 2/4 once Tailscale is up, or now if you know them.
2. Pin one unique port per project **per machine** (hub: 4747; spokes: 4751+).
3. Stage 1+ will copy this file into the hub repo, so keep it accurate.

**Check:** `jq -r '.projects[] | "\(.machine) \(.name) \(.port)"' wiring/fleet.json`
lists your whole fleet with no REPLACE-me left in the file:
`grep -c "REPLACE-me" wiring/fleet.json` → `0` (or only the DNS entries you
cannot know yet).

---

## Stage 1 — provision the VPS  *(on the VPS)*

Prereq: Ubuntu 24.04, sudo user.

```sh
# from the laptop: copy the kit up
scp -r ~/ultimate-fleet user@YOUR_VPS:~/fleet-kit
# on the VPS:
cd ~/fleet-kit/linux
FLEET_TAILSCALE_ALLOW=you@example.com ./provision-vps.sh
```

Then, **by hand** (the script prints these; they need your browser):
1. `sudo tailscale up` → open the auth URL.
2. `sudo tailscale set --operator=$USER`
3. Tailscale admin console → **DNS → HTTPS Certificates → Enable**.
4. `sudo loginctl enable-linger $USER`
5. Note the machine's DNS name into `wiring/fleet.json` (`machines.vps.dns`).

**Check:** `tailscale status` shows your tailnet; `ultimate --help` works.

---

## Stage 2 — put the hub repo on the VPS  *(on the VPS)*

```sh
mkdir -p ~/fleet-work/hub && cd ~/fleet-work/hub
git init -b main
cp -R ~/fleet-kit/hub/. .            # AGENTS.md, FIRST-PROMPT.md, .ultimate/
cp ~/fleet-kit/wiring/fleet.json .   # the roster, at the repo root
git add -A && git commit -m "fleet hub scaffold"
```

Enroll it as a service:

```sh
~/fleet-kit/linux/enroll.sh fleet
```

**Check:** `systemctl --user status ultimate@fleet` → active; the probe in
`enroll.sh` printed "healthy on 127.0.0.1:4747". Open
`https://<vps dns>:4747` in your laptop browser → the hub's UI; do the
first-run **provider login** there (⌘K → Log in to a provider), and approve the
project's `.ultimate/` setup when the trust card appears. The status line's
`tailnet` chip should show a green dot with the URL.

---

## Stage 3 — enroll VPS spokes  *(on the VPS)*

For each `machine: "vps"` project in the roster (path must exist — clone your
real projects into `~/fleet-work/<name>` first):

```sh
~/fleet-kit/linux/enroll.sh api
```

**Check per spoke:** `enroll.sh` ends with "healthy"; the hub's Fleet panel
(Stage 5) shows it green.

---

## Stage 4 — the laptop  *(on the MacBook)*

Prereqs: clone at `~/repos/ultimate` with `pnpm install` done; Tailscale app
installed and logged in; `machines.laptop.dns` + `machines.laptop.clone` filled
in `wiring/fleet.json` (keep the kit in sync with the VPS copy — git or rsync).

```sh
cd ~/repos/ultimate && pnpm add -g "$PWD"     # the `ultimate` command (once)

# user settings (merge if the file exists):
#   extensions.enable += "tailscale", tailscale.allow = [your login]
# use wiring/tailscale.user-settings.json as the shape

cd ~/ultimate-fleet
./darwin/fleet install          # renders + bootstraps a plist per laptop spoke
./darwin/fleet status           # each spoke: running · api ok
./darwin/fleet remotes          # prints the remotes JSON for the HUB's user settings
```

**Check:** `./darwin/fleet status` shows `running · api ok` per spoke; logs at
`~/Library/Logs/ultimate/com.ultimate.fleet.<name>.log`. Close and reopen the
lid — spokes come back with the machine (launchd), asleep while it sleeps.

---

## Stage 5 — wire the hub to laptop spokes  *(edit on the VPS)*

Merge `fleet remotes` output (laptop→project→URL) into the **VPS hub machine's**
`~/.ultimate/settings.json`, alongside the `tailscale` block. The hub picks it
up live (settings changes reload extensions).

**Check:** `curl -m 3 -s -X POST https://<laptop dns>:4751/api/extensions/status/actions/status \
  -H 'Origin: https://<laptop dns>:4751' -H 'Content-Type: application/json' -d '{"args":{}}'`
from the VPS returns 200 (laptop awake). The Fleet panel shows the laptop spoke
green when awake, grey "asleep" when the lid is shut.

---

## Stage 6 — day one in the hub  *(your browser, hub UI)*

Follow `hub/FIRST-PROMPT.md`: orient → sweep (the smoke test) → create the
morning-sweep automation. Approve the hub project's trust prompt once; each
**spoke** asks its own trust prompt the first time the hub asks it to run
project extensions — approve in that spoke's UI when it comes up.

---

## Mobile access — Tailscale on your phone (built-in, verified path)

This is the repo's own supported mobile story; nothing here is kit code.

**Prereqs:** hub tailscale enabled and green (Stages 1–2); HTTPS certificates
enabled in the Tailscale admin console; the Tailscale app on the phone,
logged into the same tailnet. The hub is reachable only over the tailnet —
that is the security model, not a limitation to work around.

**Install the hub as a phone app** (the whole UI, PWA-style):
1. In the hub UI, the status line's `tailnet` chip → popover shows the HTTPS
   URL as a **QR code**.
2. iPhone: scan, open in Safari → Share → **Add to Home Screen**, *Open as
   Web App* on. Android: open in Chrome → ⋮ → **Install app**.
3. Identity comes from Tailscale Serve's headers — no cookies, no public
   exposure. Each origin (host+port) is its own installed app.

**Web Push — answer from the lock screen** (the `push` extension, upstream
`extensions/push/README.md`; off by default):
1. `"extensions": { "enable": ["push"] }` in the hub machine's user settings
   (merge into `~/.ultimate/settings.json`).
2. In the hub UI on each device: the status line's **notify bell** → allow
   permission (sends a test). Android: install the app first — only an
   installed app keeps receiving.
3. What arrives: **questions waiting on you** (with inline **Reply**, and
   **Approve** when answers have recommended values — answered from the
   notification without opening the app), **landings**, and **failed runs**.
   The VAPID key (`WEB_PUSH_VAPID_KEY`) is created on first use; the bell is
   per device/browser.

**Share target** (the `share` extension, upstream
`extensions/share/README.md`): with the app installed on Android, Ultimate
appears in the system **share
sheet** — share a link/text/file from any phone app and it lands in the hub's
composer, pre-filled. Documented for Android; iOS is not called out upstream.

**Check:** phone (tailnet on) → open the installed app → run a sweep from the
sofa; turn the screen off → ask a spoke something that raises a question →
answer it from the push notification.

### Future idea — social apps (Slack / Discord / Telegram)

Nothing ships for these upstream, and the hub deliberately has no public
endpoint (loopback listener, Funnel never enabled), so platform webhooks can't
reach it. The shape that works — discussed and deferred, not built: a small
**bridge bot on the VPS** using each platform's *outbound-only* transport
(Telegram `getUpdates`, Slack Socket Mode, Discord gateway), allowlisting your
platform user IDs and talking to the hub over loopback actions
(`messages` → `tell`, short replies back to the thread; long jobs
fire-and-forget, outcomes arrive as Web Push). When wanted, it is one ~100-line
Node service + one more systemd unit in this kit's style.

---

## Maintenance

| Task | Where | Command |
|---|---|---|
| Stop a laptop spoke | laptop | `./darwin/fleet stop my-app` |
| Start again | laptop | `./darwin/fleet start my-app` |
| Spoke logs | laptop | `./darwin/fleet logs my-app` |
| Spoke logs | VPS | `journalctl --user -u ultimate@<name> -f` |
| Summon a spoke UI | laptop | `./darwin/fleet open my-app` (Chrome app window onto the running instance) |
| Update a spoke's Ultimate | that machine | `cd <clone> && git pull && pnpm install`, then restart the spoke (`fleet restart` / `systemctl --user restart ultimate@<name>`); the supervisor swaps generations without losing runs |
| Remove a spoke | that machine | `./darwin/fleet uninstall my-app` / `systemctl --user disable --now ultimate@<name>` |

## Troubleshooting

| Symptom | Meaning | Fix |
|---|---|---|
| `403` from a spoke | hub's tailnet login not in that spoke's `tailscale.allow` | add the hub machine's login to that machine's `~/.ultimate/settings.json` (user settings only) |
| `asleep` but laptop is open | spokes not bootstrapped | `./darwin/fleet install` |
| Port taken, start fails | the supervisor refuses a taken pinned port | find the old process (`lsof -i :4751`) or change the roster port |
| Fleet panel missing | the `fleet` web.tsx failed to build | Extensions tab → the error card shows the build error; paste it to the hub's @ultimate to fix |
| Spoke "not running" in hub while VPS | unit died | `journalctl --user -u ultimate@<name> -n 50`; `systemctl --user restart ultimate@<name>` |
| Hub can't see a *local* VPS spoke | roster path/port wrong | `enroll.sh` symlinks `$HOME/fleet/<name>`; check `systemctl --user cat ultimate@<name>` |
