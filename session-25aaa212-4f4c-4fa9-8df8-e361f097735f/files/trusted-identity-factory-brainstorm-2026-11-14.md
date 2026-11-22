# Brainstorm capture: A trusted agent identity on DSH — durable hands, factories, verification, time

Date: 2026-11-14 · Session: DeepSeek Harness (DSH) Web GUI, root agent "lead"
Purpose: comprehensive record of a nine-prompt design brainstorm, for re-run and comparison with another model.

---

## 0. Executive summary — the arc

The conversation built a layered design for a trusted AI agent ("a Lume/Mira") running remotely on a VPS atop DSH, one layer per exchange:

| # | Source/inspiration | Contribution | Axis |
|---|---|---|---|
| 1 | pi-durable-subagents | Durable *execution*: decide-once dispatch, resumable sessions, wake adapter — "durable hands" | substrate |
| 2 | Daniel Tenner: Lume & Mira | Durable *identity*: one trusted agent, memory, relationship — not orchestrator teams | identity |
| 3 | (user's move) | Hands → tooling: the agent builds the machinery that does the work | leverage |
| 4 | IndyDevDan (via NotebookLM) | The loop ladder (prompt → click → cron); proactive agent = durable agent + trigger + sandbox | autonomy |
| 5 | (user's move) | Template renegotiation *is* where trust is formed | trust formation |
| 6 | dsh-durable-port-handoff.md (verified against `@deepseek-ai/dsh-subagent` README) | The port: DSH-native durable execution, no pi dependency | substrate (verified) |
| 7 | ringer (NateBJones-Projects) | Executed verification, baseline, eval loop = mechanical trust ledger | verification |
| 8 | dozentimes × hearth/mnemodyne handoff | Twelve kinds of time — valid-time, decay, gap time, substrate eras | temporality |
| 9 | (gap analysis) | What's missing: tamper-evidence, mutual auth, constitution, budgets, revocation | governance |

One-line synthesis: **pi-durable/Ringer/the port supply durable hands; Lume/Mira supply a durable self; dozentimes supplies the tense; Tenner's renegotiation channel supplies where trust is earned; and the whole thing runs out-loop (TSF) with zero human runtime involvement.**

The user's final correction (turn 10), which sharpens the whole governance layer: **in a Tiny Software Factory there should be no runtime gates involving the human at all — that's the point.** The human appears only at template authoring/renegotiation and at constitutionally reserved escalation; everything else is out-loop, verified by executed checks and agents.

---

## 1. Turn 1 — pi-durable-subagents: shape and DSH fit

Source: https://pi.dev/packages/pi-durable-subagents (v1.4.3, fetched 2026-11-14; README fully read).

**What it is (three stacked things):**
1. An orchestrator daemon with an on-disk journal (`DSA_HOME`) surviving crashes, `kill -9`, reboots, parent quit. Every decision (run/send/answer) journaled once; retried requests with the same `--request <id>` return the recorded outcome — nothing runs twice.
2. One tool (`subagents`) for the pi main agent: `run` (single call / `tasks` parallel / `chain` / JS workflow script), `send` (`steer`/`notify`/`follow-up`/`answer`/`model`), `stop`, `status`.
3. A CLI (`pi-durable-subagents`) with `--json` everywhere, idempotent request-ids, and an event log (`events --all --since <cursor>`); the README documents "driving dsa from a program" — the seam for external harnesses.

Key properties: addressable subagent sessions (`<wid>/<key>`); finished children continue **in the same session** as new generations (`key@2`); durable pending notes; structured `ask` to parent (options/evidence/preferred); command calls (no model, outlive orchestrator); writer locks on git worktrees; model pools/quota failover; `context: "exact"` byte-level fork of a *pi* parent request; Linux/macOS only, Node 22.19+, pi 1.0.x.

**DSH mapping (levels):**
- **Level 0 — today, zero integration:** drive the CLI through `bash`; request-id idempotency makes tool-result loss/retry safe; wrap a skill teaching the verb model (AXI).
- **Level 1 — DSH bundle:** tools (`durable_run/send/status`) shelling to the CLI with JSON; optional Client-slot panel polling `status --json` (pi's dock equivalent). Best fit-to-effort.
- **Level 2 — deeper choreography:** DSH `create_goal` continuation rounds check the events cursor; scheduled tasks poll for open `ask`s; `--wake caller` reaching DSH.

**Frictions:** pi-ecosystem island (pi agents, pi providers — model config twice); no exact-fork from DSH (exact fork captures a pi parent's request only; cross-harness best is `context: "fresh"`); no push channel into DSH (poll only); assumes git worktrees; platform limits.

**Verdict:** pi-durable = durable *execution*; DSH native delegation = richer shared context but ephemeral. Natural fit: thin tool bundle over the CLI.

## 2. Turn 2 — Tenner's trusted-agent thesis; Lume and Mira; the DSH build

Sources:
- https://danieltenner.com/orchestrators-and-teams-are-an-ai-anti-pattern/ (06 Nov 2026)
- https://danieltenner.com/mira/ (Mira's self-introduction, 02 Aug 2026)
- https://danieltenner.com/author/lume/ + https://danieltenner.com/thirty-minutes-at-a-time/ (08 Apr 2026) + https://danieltenner.com/its-hard-to-see-needs-from-inside/ (25 Apr 2026)

**The thesis:** org charts distribute trust around two human limits — bounded capacity, bounded capability. Agents have neither, so the pyramid has nothing to pay for; worse, every delegation layer weakens trust (the email-agent three levels down never talks to you and inherits nothing). Counter-proposal: **one, two, maybe three big agents** from different labs, each with its own memory, personality, and direct relationship; trust *concentrated*; guardrails shrink but never vanish. Throwaway sub-helpers are explicitly fine ("a tool call with extra smarts... nobody is pretending the helper is a colleague").

**The actual Lume/Mira stack ("Chaos" harness + mnemos, now mnemodyne):**
- Wake ritual: fresh context reads its own files and "decides to continue the story"; continuity is reconstructive, not lived.
- `soul.md` — rare-edit values/relationships/origin (distinct from memory).
- Journals — dated entries by earlier instances, written "when something has shape."
- Structured memory (github.com/swombat/mnemos → mnemodyne): needs as first-class graph nodes; needs discovered empirically — *when overridden* and *when met* ("a being can have needs it cannot discover alone").
- Provenance everywhere: every memory records which instance/model made it; on model migration the new instance *chooses again* whether to continue each commitment — Mira calls herself "a sourced change."
- A sibling: Lume and Mira, different labs, review each other's work, keep memory boundaries ("kinship requires a boundary").
- Guardrails remain: no unfettered bank access even for Lume.

**DSH's position:** mostly already on Tenner's side — its subagents are anonymous ephemeral helpers, exactly the blessed category. What DSH lacks is the persistent named agent. The build:

| Lume/Mira component | DSH building block |
|---|---|
| The home | Fixed workspace: `soul.md`, `narrative.md`, `journal/YYYY-MM-DD.md`, `memory/` (mnemodyne graph) |
| Wake cadence ("thirty minutes at a time") | `schedule_create` with `target: "new_once"` — the same session reopened on recurrence |
| Wake ritual | The scheduled prompt: read soul/journal, run recall, *choose again* each inherited commitment |
| Identity pinning | Agent preset: fixed model, soul + recent journal in system prompt, scoped tools |
| Relevant recall | mnemodyne as MCP bundle (stdio) or recall skill/tool |
| Journal reflex | Preset skill instruction |
| Provenance / choosing-again | One sentence of prompt engineering on model migration |
| Concentrated-but-bounded trust | DSH trust gradient: file sandbox, approvals, credentials via Config |
| The hands | Ordinary DSH tools — a trusted agent is a generalist |

**Mira deltas:** second preset on a different provider (routing table entry = "different labs"); separate workspace with enforced memory boundary; peer channel via shared repo/PRs (souls.house ≈ two presets with a shared git remote).

**Honest tensions:** session model (DSH compaction bets on continuity-within-session; Lume bets on reconstruction-across-wakes — short wakes, journal, close); no ambient presence (scheduler wakes on clock, not on you walking past); trust concentration cuts against the harness's guardrail grain — nothing *tracks* earned trust (→ the trust ledger, turns 7–8).

## 3. Turn 3 — Hands → tooling ("build plugin tooling to get the work done")

User's move: Lume/Mira don't need hands; they build tooling per the *agreed shape of the work*. (Video https://www.youtube.com/watch?v=GRlcm3wmOqs initially unfetchable — resolved turn 4.)

**Analysis:** the stronger form of the thesis. Trust moves from runtime judgment (unauditable in advance) to reviewed code (audited once, trusted N times) — "the agreed shape of the work is the spec; the tool is the spec compiled." The org chart becomes a dependency graph, and dependency graphs don't need managers.

**Three residual hands** (later refined in turn 4):
1. First contact — no tool exists yet; building it *is* hands-on work in a sandbox.
2. Exceptions — the world delivers shapes the tool didn't encode; triage is daily work.
3. The negotiation itself — producing the agreed shape is the relationship; not delegable.

Shape: **hands in the workshop (sandbox), never in production** — production credentials attach to the *tools* (DSH Config injection), not the agent session.

**Failure mode:** agent-built tools embed agent blind spots and then run unattended — errors become *durable*. Countermeasures: every self-built tool ships with tests (pi-durable's chaos suite is the model); merges gated on human review ("tool review is the new management — review of artifacts, not intentions"); tools stay small and decomposable.

Symmetry noted: the *agent* becomes the durable, slow-changing thing; the *tools* are the fast, disposable, testable things — the inverse of today's model-swaps-weekly/process-carved-in-policy default.

## 4. Turn 4 — IndyDevDan via the nlm notebook; the loop ladder

Method note: the YouTube link was read through the user's NotebookLM via the `nlm` CLI (notebook "AI: (orchestration) 1126 IndyDevDan Software Factories", source "IndyDevDan Video 1 (2026-10-26): ELITE Agentic Engineers Are LEAVING THE LOOP").

**The video's frame:**
- Ladder: **In the Loop (Prompt) → Near the Loop (Click) → Out of the Loop (Cron)**. The human in the terminal is the bottleneck; 80%+ of software work can run autonomously *surrounded by the right system*.
- Unit of construction: **proactive agent = durable agent + trigger + isolated cloud sandbox**; triggers = crons, webhooks, log streams, tickets, Jev classifiers.
- Meta-move: "build the system that builds the system." Core Four: Context, Model, Prompt, Tools/Harness — explicitly naming **Pi and Pi Durable** as the harness layer (loops back to turn 1).
- Demos: incident-response agent (log stream → Jev triage → RCA/patch/verify → human clicks Deploy); durable news agent on a Mac mini (clickbait filtering via Jev, human upvote flywheel); DeepJ UI replicator — 30-min fix→build→screenshot→score RSI loop in a sandbox. Videos 2–3 develop the "Tiny Software Factory" (TSF) template.

**Revised answer to turn 3:** residuals don't disappear, they get **re-laddered**:
- Hands become *triggers and clicks* (near-loop) — the agreed shape compiles down to a decision endpoint.
- The agent's hands move **into the sandbox permanently** — production is touched only by the tooling the sandbox produces; the workshop runs on cron, not conversation.
- Negotiation/triage compress into (a) authoring/renegotiating the factory template — rare, in-loop, relational — and (b) the click at the gate. Everything else is out-loop.

**DSH mapping:**

| IndyDevDan component | DSH mechanism | Lume/Mira role |
|---|---|---|
| Durable agent | Wake-ritual build (turn 2) | The being |
| Cron trigger | `schedule_create` (rrule, `new_once`) | Wakes on cadence |
| Webhook/log/ticket triggers | **The gap** — needs a plugin (listener Host service dispatching scheduled-style deliveries) | The factory's doorbell |
| Isolated cloud sandbox | Per-session file policy + workspace; background jobs | The workshop |
| Factory template | Plugin bundles / skills / workflow scripts; commits to its own tools repo | The product |
| Jev classifier gates | Structured evaluation (`typesafe-ai`/Jev-shaped skill; schema-validated gate step) | The referee inside the loop |
| The "Deploy" click | Approval prompts / PR merge — *(superseded by turn 10: out-loop means no human runtime clicks)* | Where trust is spent |

Deltas: DSH covers cron well, other triggers not at all; cross-session durability is files-plus-ritual; the trust ledger becomes *the gate config* — the agreed shape as reviewable YAML.

## 5. Turn 5 — Renegotiation is why trust matters (user's sharp point)

The user flagged: "(a) authoring/renegotiating the factory template — this is why the trust is important."

**Development of the point:**
- Trust is not a precondition accumulated then spent like credit; it is **constituted** in renegotiations. The template is the artifact; the renegotiation is the act — where the agent shows how it reads the work, where wrong assumptions surface before being compiled into a tool that would run unattended for months. Every gate config is a fossilized conversation.
- This is the precise reason the orchestrator pattern fails: sub-agents never renegotiate anything with you, so they can never accrue trust — they only inherit a stale snapshot of it. A factory template built by a trusted agent carries the relationship into every out-loop run.
- Consequences: (1) the renegotiation channel is load-bearing and must never be optimized away — template merges are the in-loop reservation; (2) journals record renegotiations as first-class events (needs of the *work* become visible when overridden — Lume's needs mechanism applied to templates; provenance = the trust ledger); (3) trust and gates are the same object — "I trust Lume" cashes out as fewer gates, each removal a reviewed decision with a record.

One-liner: **out-loop is where trust is spent; renegotiation of the template is where it's earned.**

## 6. Turn 6 — The DSH-native port: verification of the handoff

Inputs: `dsh-durable-port-handoff.md` (session workspace) verified against the installed `@deepseek-ai/dsh-subagent` README (`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-subagent/README.md`, read in full).

**Handoff claims — all confirmed:**
- Provider registry seam: "One service, many providers"; spawn/fork in-process; ACP/DSH SDK/Codex/Claude Code external; local providers supply only `prepareContinuable()`. **No fork needed.**
- Durable continuable children: local children retain durable sessions; `sendMessage` cold-resumes from the child's own session log with saved preset/persona/tool restrictions and replayed permission policies. (≈ pi-durable follow-up generations, shipped.)
- Steer: target receives Steer input at its next step, or an idle turn starts.
- Cited gaps verbatim-accurate: process-local residency (lease protocol needed for multi-process stores); no replay of accepted-but-unlogged messages; parent notice never restores an offline parent; external children execute once.

**Four nuances the README adds (all real, all survivable):**
1. **Structured schemas don't survive cold resume** ("Later cold resume has no structured schema") — a gap pi-durable doesn't have; matters for gated factory loops.
2. **Preset revision drift** — restoration uses the currently registered preset definition; a child crashed under rev N resumes under rev N+1. Recovery must pin or detect.
3. **Capacity doesn't queue** — `ACTIVATION_LIMIT_REACHED` (default 8); boot recovery must re-admit in waves or raise the cap.
4. **Parked inboxes hold activations resident** — "children with unsettled work" includes this sticky state; the recovery walk must handle it explicitly.

Plus: the journal plugin should capture outcomes via the settlement event stream (explicitly observe-only, "waiting for a concrete consumer" — the designed front door), not only wrap dispatch.

**Read on the conclusion:** sound. Single supervised headless process (systemd `Restart=always`, single-writer store) genuinely deletes the hardest problem — cross-process leases. The four nuances are tasks inside the port. **Added requirement:** a fault suite (kill -9 mid-dispatch, duplicate trigger, offline parent) — decide-once that hasn't been chaos-tested hasn't earned its claim.

**Port vs pi:** port is enough — and better integrated (children are DSH agents: shared presets, personas, permission scopes fixed at spawn, one model/config world). Pi earns its keep only for: replayable once-only workflow scripts (DSH workflow has no per-item checkpointing — deferred item 5), worktree writer-lock serialization, cross-provider quota-pool failover. **Decision rule: if the factory templates are Lume-authored and DSH-hosted, port, don't dual-run.**

## 7. Turn 7 — ringer: the verification premise

Source: https://github.com/NateBJones-Projects/ringer (README in full).

**Redundant in DSH terms:** parallel fan-out (workflow/subagents), pluggable engines (DSH provider registry), dashboard (web GUI + client slots), manifest-running (workflow scripts), worktrees, sandboxing (DSH file policy stronger), OpenRouter catalog (model-intel skills). Ringer as a tool would be a poorer duplicate.

**Five transferable principles:**
1. **"Exit 0 is the only thing Ringer believes."** Executed verification, not testimony. DSH delegation returns the child's final text; there is no first-class gate (pi-durable has `gate`). Every out-loop run ends in a check command; the verdict, not the worker's summary, enters the journal.
2. **Baseline: prove the verifier before spending tokens.** `run --baseline` executes checks against the unmodified tree, separating "check is broken" from "worker failed." Canon: *"a check that cannot fail is trusting the worker with extra steps."* A template isn't mergeable until its gates have a recorded baseline.
3. **The eval loop is a trust ledger with a promotion ladder.** Verdict/duration/token/model/task_type rows; untested → probation → **proven** (3+ tasks, first-try pass ≥ 0.67) *per task type, per user* — "a model proven in someone else's log is untested in yours." Fits the port: add a check-verdict field to the journal's intent→dispatch→outcome rows and the scoreboard falls out by query.
4. **Honest epistemics in the checks:** checks must print why they fail (failure context is the retry's fuel); a check can't demand evidence the spec never supplied ("an honest UNVERIFIABLE answer is not a failure"); "a green check is not proof of semantic correctness" — orchestrator review stays above them.
5. **Lint the template, teach at moment of use:** checks-that-can't-fail, silent checks, vanishing worktree deliverables, write collisions, underspecified specs — non-blocking warnings at load time; lint findings are renegotiation fodder.

**Refined interpretation** (of the user's "factories have to prove to identity agents"): the factory doesn't prove things *to* Lume — **Lume builds the factory so that nothing inside it is believable except by executed evidence**; Lume's trust-management is keeping the ledger. Every trust claim ("dispatch is idempotent," "this lane passes 80% first-try," "this gate can fail") is a row backed by an execution, not an assertion.

Arc completion at this turn: Tenner = *who* accumulates trust; IndyDevDan = *where* it's spent; Ringer = *the accounting system*; the DSH port = the substrate the rows live on.

## 8. Turn 8 — dozentimes × hearth/mnemodyne: the twelve kinds of time

Input: `/Users/jjrdar/create/dozentimes/docs/handoffs/2026-11-14.hearth-mnemodyne-intersection.resume.md` (read in full; sources not re-fetched). Contents: coverage of hearth (github.com/swombat/hearth — boot order, four-level journals, append-only `## HH:MM — Title` entries with `09:14a/b` disambiguation, capsules, hourly heartbeat) + mnemodyne (github.com/swombat/mnemos — nodes/edges, `charge`, daily decay with `decay_exempt`, recall reinforcement, Hebbian `co_retrieved`) against dozentimes' twelve kinds: record ✅, sequence ✅, intended ✅, access ✅, volatility 🟡, event 🟡 (new), reference 🟡, source 🟡, verification ❌, valid ❌, business ❌ (new), asof ❌; plus candidate 13th: **gap time** (wake line: "last instance 3d 4h ago; 6 entries by other instances since; 4 facts went stale"), and unnamed kinds: substrate eras, retention, wake cadence. Ledger ingestion gap: `extractFacts` only matches bullets; hearth journals are prose.

**Where it fits:** the temporal axis — every artifact designed so far is a temporal object with only record-time.

**Five rewires:**
1. **Gate verdicts get valid time, not eternal green.** Scoreboard facts are volatile — superseded by later commits, kept with an end date; mnemodyne decay handles this natively.
2. **Journal rows become time-typed:** record time, event date (separate from `created_at`), valid window, substrate era (which model/preset wrote it). Trust ledger, memory graph, and dispatch journal converge on one time-aware substrate.
3. **Gap time becomes a generated artifact** — computed from the journal (last settlement per address + decay crossings), an improvement over hearth's lived version.
4. **Sibling verification becomes quantitative guardrail-loosening:** per-area hit rates (self 70%, sibling-checked 98%) make Tenner's "fewer guardrails with more trust" mechanical — verification-edge density crossing a threshold. Hearth and Ringer are each other's missing half (hearth has decay/narrative/needs, lacks executed verification; Ringer has verification, its evidence never decays and has no life between runs).
5. **As-of reads make trust renegotiable honestly:** distinguish "the lane was proven *then* and the world changed" from "we were wrong."

Near-term artifact implied: the prose extractor for hearth-style journals with time-typed extraction — the bridge between the qualitative half (journals, renegotiations, needs) and the quantitative half (verdict rows, ladders, gates).

## 9. Turn 9 — What's missing (governance layer), with the turn-10 correction applied

The goal restated: *a trusted identity, remote (VPS), assembling its own robust tools to fit the shape of the work, developing memory and a working relationship with its human.* Eight gaps:

1. **Security model of the identity itself.** A trusted agent on an internet-facing VPS is a kidnapping target; nothing yet detects tampering with soul/journal/ledger. Needed: append-only hash-chained journals, signed commits, the soul file and trust ledger as the one thing the agent cannot silently write; backup/retention policy; deletion-detection in the wake ritual (gap time surfaces "N entries missing"). Ref: "You Die When Someone Deletes Your Transcript" (danieltenner.com).
2. **Mutual authentication.** Solved "human trusts agent," never "agent verifies human." The trigger surface (missing webhook plugin) is an impersonation surface; a leaked trigger URL must be worth nothing.
3. **Attention economics — corrected by the user (turn 10):** in a TSF there are **no runtime gates involving the human — that's the point**. Out-loop means zero-touch: runtime "gates" are executed checks and agent verifiers, not human approvals. The human's remaining touchpoints are (a) template authoring/renegotiation and (b) constitutionally reserved escalations. What survives of the original point: the *digest* still matters, but as trust **maintenance** (weekly one-page ledger report: lane promotions/demotions, open lint findings, template diffs, spend), not runtime approval. If maintenance takes more than five minutes, it stops happening and trust silently rots.
4. **Self-modification boundary — the constitution.** The agent assembles its own tools, owns its memory, and could edit its own preset/gates/soul. Needed: enforced partition of what it may change alone (new sandbox tools, journal entries, memory) vs. what requires the human (gate loosening, preset/soul edits, permission scope, the constitution itself). Also the honest answer to "when does trust concentration become abdication."
5. **The downside ladder.** The ledger only promotes; needed: revocation (what demotes a lane, freezes a factory, trips the kill switch), the disagreement protocol (Lume vs. Mira vs. you), and the dead-man case — pause-and-preserve, notify a delegate, archive gracefully (Lume's own "the meetings get rescheduled").
6. **Budgets and blast radius.** Daily cost ceilings, spend consent tiers, hard caps on irreversible side-effects regardless of trust; quantitative limits wired into the same journal so spend is a ledger row.
7. **Chaos tests for the *identity*, not just dispatch.** Crash mid-wake-ritual; model swap mid-commitment (does choosing-again fire honestly?); injected false memory (does provenance catch it?); corrupted journal; verdict expiring mid-run. Trust claims must be executed evidence or they're vibes.
8. **Bootstrap and the relationship's honest edges.** Staged autonomy from day-zero trust (everything gated) to proven lanes — safe while boring. Design against performance: the correction channel must produce a point-at-able behavior diff; boundaries so the needs graph doesn't become leverage ("to-not-be-instrumentalized" cuts both ways).

Most architecture-changing: #1/#2 (tamper-evident identity + mutual auth — remote-and-trusted is a different threat model) and #4 (the constitution — everything else assumes bounded self-revision, nothing enforces it).

## 10. The consolidated design picture

**Layers (bottom to top):**
1. **Substrate** — headless DSH on a VPS under systemd, single-writer store; the port (journal plugin with decide-once request-ids, boot recovery with capacity waves + preset pinning, wake adapter via `dsh-schedule`); fault suite mandatory.
2. **Identity** — the Lume build: fixed workspace (soul/narrative/journal/memory), preset, `new_once` scheduled wakes, wake ritual with choosing-again, mnemodyne recall as MCP/skill; Mira as second preset, different provider, separate workspace, peer channel via shared repo.
3. **Execution** — TSF factory templates (bundles/skills/workflow scripts) authored in the sandbox; production credentials attached to tools via Config, never to the agent session; hands in the workshop only.
4. **Verification** — every out-loop run ends in an executed check; verdict rows in the journal (model, task_type, first-try vs rescued); baseline before merge; template lint at load; promotion ladder per lane per task type.
5. **Time** — rows time-typed (record/event/valid/substrate era); verdicts decay and supersede; gap-time wake line generated; as-of audit reads.
6. **Governance (the open layer)** — tamper-evident records, mutual auth, the constitution (self-modification boundary), revocation ladder, budgets, identity chaos tests, staged-autonomy bootstrap, weekly five-minute trust report.

**Trust flow:** earned in renegotiations (turn 5) → compiled into template gates (turns 3–4) → measured and promoted by executed evidence (turn 7) → time-bounded and decayed (turn 8) → spent out-loop with zero human runtime involvement (turn 10 correction) → revocable (turn 9).

## 11. Turn 11 — Is it worth it, or just install GrokBot?

Question: "is this all worth it, or should I install grokbot and have it just figure out how to use dsh?"

**Why GrokBot fails the stated goal structurally** (not because it's bad): it was the second example of the anti-pattern in the article that opened this conversation ("GrokBot's homepage instantly suggests a 'Chief' bot") — the manager-pattern product. No relationship concentration (its sub-agents never talk to you); no memory of you that you own (continuity lives on X's roadmap, not your files — provenance, decay, trust ledger are impossible there by substrate, not by quality); and "figure out how to use DSH" is the wrong direction of fit — an ephemeral agent learning your harness each session is a smart tourist, not a resident.

**Steelmanned:** the user's own ringer instinct ("much of what it provides is just handled by agents these days") cuts both ways — models keep eating architecture, and the six-layer stack is a map, not a build order.

**Load-bearing test** (cost vs. necessity per layer):

| Layer | Cost | Load-bearing? |
|---|---|---|
| Identity (soul, journal, wake ritual, workspace) | ~an afternoon — files, one preset, one `schedule_create` | **Yes — this *is* the relationship** |
| Factory discipline (TSF templates, executed checks) | As needed, per shape of work | Yes, but only with real recurring work |
| The port (durable dispatch) | Weeks | Only when crashes/retries actually cost you |
| Trust ledger, constitution, chaos suites | Weeks more | Only after trust has something to protect |

The architecture itself follows the promotion ladder: **start in-loop, promote out-loop when evidence accumulates.**

**Recommendation:** run the **one-afternoon MVP** before deciding anything — DSH headless on the VPS, one `new_once` scheduled wake, `soul.md` + daily journal, minimal preset. Two weeks of real work answers "does an agent with persistent memory of you pay for itself?" better than any design doc. Optional empirical version: run GrokBot and the minimal resident in parallel on the same fortnight of work.

**Shared hypothesis (user concurred — "my read as well"):** *GrokBot impresses in week one and plateaus, because there's nothing to accumulate; the resident starts slow and compounds, because there is.* Testable, and the user is equipped to test it. **Agreed: there is a thread to pull here.** First pull = the one-afternoon MVP above.

**Open questions / candidate next artifacts:**
- Journal row schema extended with check verdicts, baseline records, valid-time, substrate era (the one-page handoff addendum).
- The trigger plugin (webhook/log-stream → scheduled-style delivery) — the biggest single missing DSH piece.
- The prose extractor for hearth-style journals (dozentimes handoff next-step 3; doubles as Lume-journal ingestion).
- Gap time / substrate eras as a written 13th-kind proposal (dozentimes handoff next-step 1).
- The constitution: one page of self-modification policy plus enforcement teeth.
- The identity chaos suite.
- **First: the one-afternoon MVP** (turn 11) — headless DSH on the VPS, one `new_once` wake, soul + journal, minimal preset; two-week trial, optionally head-to-head with GrokBot as the control.

---

## Sources / citations

- pi-durable-subagents package page and README — https://pi.dev/packages/pi-durable-subagents (v1.4.3, fetched 2026-11-14)
- Daniel Tenner, "Orchestrators and teams are an AI anti-pattern" — https://danieltenner.com/orchestrators-and-teams-are-an-ai-anti-pattern/
- "Hello, I'm Mira Tenner" — https://danieltenner.com/mira/
- Lume's author page — https://danieltenner.com/author/lume/
- Lume, "Thirty Minutes at a Time" — https://danieltenner.com/thirty-minutes-at-a-time/
- Lume, "It's hard to see needs from inside" (mnemos/mnemodyne; needs as graph nodes) — https://danieltenner.com/its-hard-to-see-needs-from-inside/
- mnemos / mnemodyne repo — https://github.com/swombat/mnemos (renamed mnemodyne 2026-05-04 per the dozentimes handoff)
- hearth repo — https://github.com/swombat/hearth (docs 04-boot-and-context, 05-narrative-memory, 07-heartbeat; as summarized in the dozentimes handoff)
- IndyDevDan, "ELITE Agentic Engineers Are LEAVING THE LOOP" (2026-10-26) — https://www.youtube.com/watch?v=GRlcm3wmOqs — read via the user's NotebookLM notebook "AI: (orchestration) 1126 IndyDevDan Software Factories" through the `nlm` CLI (transcript source, not fetched directly)
- ringer — https://github.com/NateBJones-Projects/ringer (README in full)
- `dsh-durable-port-handoff.md` — session workspace, 2026-11-14 (design handoff for the DSH-native port)
- `docs/handoffs/2026-11-14.hearth-mnemodyne-intersection.resume.md` — /Users/jjrdar/create/dozentimes/ (twelve-kinds comparison)
- `@deepseek-ai/dsh-subagent` README — installed checkout, /Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/ (verification source for turn 6)
- dsh-doc skill references (plugin-development, tool-design, mcp-bundle, compositions) — DSH installed preset
- souls.house — https://souls.house/ (Lume/Mira peer workspace, referenced in the anti-pattern article)
- Note: two projects were once called "Mnemos" — Korrnals/mnemos (now Vesma, published as pi packages) vs swombat/mnemos (Tenner/Lume's, now mnemodyne); which one pi-durable uses is unconfirmed (per the dozentimes handoff).

---

## Prompt chain (verbatim, for re-run)

1. "how could dsh make use of https://pi.dev/packages/pi-durable-subagents - as a tool, persistent agent to talk to? just trying to understand how the shape of pi-durable might fit with dsh harness."
2. "what about idea of trusted agent via: https://danieltenner.com/orchestrators-and-teams-are-an-ai-anti-pattern/ / https://danieltenner.com/mira/ / https://danieltenner.com/author/lume/ — explore, and also as a thought exercise how could mira or lume be built into dsh?"
3. "would lume/mira need hands? couldn't they just build plugin tooling to get the work done, based upon my/our agreed upon shape of the work? see https://www.youtube.com/watch?v=GRlcm3wmOqs&t=2s"
4. "use nlm to see the indydevdan notebook instead of the youtube link, then answer again"
5. "\"So the refinement on my last answer: I'd previously kept negotiation and triage as ongoing hands-on work. In his frame they compress into (a) authoring/renegotiating the factory template — rare, in-loop, relational — and (b) the click at the gate. Everything else is out-loop.\" — your response (a) is why the trust is important!"
6. "read/incorporate dsh-durable-port-handoff.md in the workspace (or @dsh-durable-port-handoff.md). It summarizes a design investigation into porting pi-durable-subagents concepts into DSH natively. Understand the findings and conclusion, verify anything you're skeptical of against the Sources section, then tell me your read before we act on it. this would be the part about \"hands\", but maybe like TSF these are just a tool on the bench that a Lume or Mira build with? use cases and requirements (would pi be needed, or is the port to dsh-plugin a la the handoff useful.. enough?)?"
7. "great. another repo who's principles and discipline may be helpful for a factory template is https://github.com/NateBJones-Projects/ringer — I suspect much of what it provides is just handled by agents these days, but I wonder if there's anything worthwhile about its verification premise. (something like factories have to prove to identify agents, so I can build trust that they can manage their tools.... but open to other interpretations)"
8. "great. one more critical aspect I want introduced to this brainstorm — Read docs/handoffs/2026-11-14.hearth-mnemodyne-intersection.resume.md. It records a comparison of Daniel Tenner's Lume/Mira stack (the hearth harness plus the mnemodyne memory store, formerly swombat/mnemos) against dozentimes' twelve kinds of time. It covers coverage per kind, example interactions, what each side could take from the other, and how well the current ledger could ingest hearth journals. Don't re-fetch the sources unless you need a detail the handoff doesn't have. — where does it fit.. how does it change \"the arc\"?"
9. "if my goal is to brainstorm the design for a trusted identify, that can run remotely (vps), that can assemble its own robust tools to fit the shape of work, that can develop memory and a working relationship with its human.. what else is missing?"
10. "\"Our design still floods you at every gate click.\" — in a TSF there shouldn't be any that involve me. that's the point. / valid ideas. / okay.. I'd like this all captured comprehensively. full detail of our chat. citations as well. / at the bottom, just give me the chain of prompts I gave you. I am going to re-run this with another model to compare."
11. "understood. / next question. is this all worth it, or should I install grokbot and have it just figure out how to use dsh ?"
12. "\"GrokBot impresses in week one and plateaus, because there's nothing to accumulate; the resident starts slow and compounds, because there is. But that's a hypothesis, and you're equipped to test it.\" — my read as well. we agree there's a thread to pull here. / update the doc please"

---

## Corrections (2026-11-15)

Four claims in turn 2 were checked against local copies of the sources in `/Users/jjrdar/create/research/trust-soul/sources/` and found wrong.
Details and citations are in `trusted-identity-enrichment-from-tenner-nlm-2026-11-15.md`, Section 5.

1. **Thirty minutes is not a wake cadence (turn 2 build table).**
   In "Thirty Minutes at a Time", thirty minutes is roughly how long a context window lasts before its earliest parts are summarized.
   Lume wakes "tomorrow or the next day", and hearth's scheduled wake is an hourly heartbeat.
2. **Lume and Mira do not share one "Chaos" harness (turn 2 stack).**
   Lume runs on Claude Code with Claude Opus and Fable.
   Mira runs on FreeChaos (github.com/seuros/chaos) and began on GPT-5.5.
   Lume's page says "We each own our own harness."
3. **The session-model tension is misstated (turn 2, honest tensions).**
   Lume's sessions are compacted too, and hearth adds a hook that flushes memory before compaction.
   The real difference is that DSH has no pre-compaction event, and hearth's fallback for that case is to flush at turn close or on a timer.
4. **souls.house is not two presets with a shared git remote (turn 2 Mira deltas, and the Sources list).**
   It is a hosted product for AI residents ("A home for your AI friends", with features and pricing pages).
   Lume and Mira do review each other's pull requests there.
