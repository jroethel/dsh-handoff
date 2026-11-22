---
name: fleet-sweep
description: Health-check every spoke in the fleet roster and report one compact summary to the user. Use when a sweep automation fires, or when the user asks to sweep, check the fleet, or asks how the spokes are doing.
---

# Fleet sweep

Work from the roster in `fleet.json` at this repo's root. Every spoke is a running (or asleep) Ultimate with
the `status` action; the endpoint is
`POST <url>/api/extensions/status/actions/status` with body `{ "args": {} }`, answering `{ "result": <Status> }`.

## 1. Build the call list

- Read `fleet.json`. The hub's own machine is `hub.machine`.
- A spoke whose `machine` equals the hub's machine: call it over loopback, `http://127.0.0.1:<port>`.
- Any other spoke: call its machine's Tailscale URL, `https://<machines.<machine>.dns>:<port>`. These calls
  need an `Origin` header of the target's own origin (`postAction`'s rule), and the hub machine's tailnet
  login must be in that spoke's `tailscale.allow`.

## 2. Call each spoke

With `bash` + `curl`, one call per spoke, 3-second timeout, all in parallel:

```sh
curl -m 3 -s -X POST '<url>/api/extensions/status/actions/status' \
  -H 'Content-Type: application/json' -H 'Origin: <same origin as url>' \
  -d '{"args": {}}'
```

Classify the result:

- HTTP 200 → healthy; parse `result`.
- Connection refused / timeout / DNS failure → **asleep** if the spoke's machine is expected away (the
  laptop), **down** otherwise.
- HTTP 403 → the hub's tailnet login is not in that spoke's `tailscale.allow`: wiring problem, tell the user
  the exact machine and project.

## 3. Report, compact

One line per healthy spoke: name, busy count, `behind`/`ahead` if known, provider state if not all `ok`.
Then, only what needs the user:

- `failures`: each with conversation title, error line, and whether it was retried.
- `questions`: open questions waiting on the user — surface them verbatim, with the spoke's name; never
  answer them.
- Any spoke down or refused (403), with its machine.
- `extensions` entries with `error` (a broken extension after a rollout).

Skip everything that is fine. End with the count: `N spokes healthy, M asleep, K need you`.

## 4. Never

- Never re-send a failed spoke's queued work; report it.
- Never edit a spoke's settings to "fix" a 403; tell the user which machine's `tailscale.allow` needs the hub
  login.
- Never let one unreachable spoke fail the sweep; the roster's laptop spokes are expected to sleep.
