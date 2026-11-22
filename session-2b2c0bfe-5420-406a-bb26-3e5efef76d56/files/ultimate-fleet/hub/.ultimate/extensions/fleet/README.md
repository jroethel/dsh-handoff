# Fleet dashboard extension

A right-panel tab on the hub: one row per spoke in `fleet.json`, polled every 30 seconds through the
server-side `overview` action (so cross-machine calls carry the target's own `Origin`, the same rule
`lib/remote.ts` enforces for codemode reads).

## Files

- `server.ts` — reads `<projectRoot>/fleet.json`, POSTs each spoke's `status` action (loopback for spokes on
  the hub's machine, `https://<machine dns>:<port>` for the rest), classifies every non-answer as
  `asleep` (connection refused — a laptop with the lid shut), `unreachable` (DNS/timeout), `refused` (403 —
  allowlist wiring), or `error`.
- `web.tsx` — the `fleet` panel: state dot per spoke, amber counts of questions waiting for you and failures,
  `busy` and `behind/ahead` when known, sorted so spokes that need you come first.

## Honest status of this code

The shapes follow the shipped `projects` and `status` extensions (`defineExtension`, plain `actions` maps,
`api.action(actionRef(...))`, `defineWebExtension({ panels })`) but have **not** been type-checked against the
clone in this kit — the hub will type/build them on first load. If the panel does not appear, open the
Extensions tab: a `web.tsx` that does not build is rejected with the build error in its card. The intended
fix loop is the Ultimate one: paste the build error to the hub's @ultimate and let it correct its own
extension, then commit the result with this repo.
