# Day one: paste this into the hub's @ultimate

> These are three separate prompts. Run them in order, reading each reply before the next.

## Prompt 1 — orient

```text
Read AGENTS.md and fleet.json in this repo, then tell me in five lines: which projects are in the roster,
which machine each runs on, and which you expect to be asleep right now. Do not start any work yet.
```

## Prompt 2 — first sweep (the smoke test)

```text
Run one fleet sweep now, following the fleet-sweep skill exactly. After the report, tell me for each spoke
whether the call was loopback or tailnet, so I can check the wiring.
```

Expected: healthy spokes get one line each; laptop spokes show as asleep if the lid is shut; a 403 means the
named machine's `~/.ultimate/settings.json` needs the hub machine's tailnet login in `tailscale.allow`.

## Prompt 3 — make it standing

```text
Create an automation named "Morning sweep": cron 0 9 * * 1-5 in my time zone, prompt run that performs a
fleet sweep following the fleet-sweep skill and ends with the counts line. Then confirm the automation's
next fire time.
```

## Later, once the dashboard extension is installed

```text
Look at the Fleet panel in the right panel. If anything is missing that the status action provides, add it
to the panel and commit the change with this repo.
```
