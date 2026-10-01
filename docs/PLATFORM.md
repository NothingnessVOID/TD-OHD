# Open Human Design — Platform Architecture

> Current TD-OHD runtime updated 2026-10-01 after the SharpAstrology migration.
> The cloud platform, pricing, brand and roadmap sections preserve the historical
> 2026-06-04 planning record. Those plans are optional and are not the current
> production deployment. Companion to `RESEARCH.md` (product requirements).

## Current runtime architecture

Production: [TD-OHD on Netlify](https://td-ohd.netlify.app/), a static deployment.
Birth, Transit and Timeline realtime snapshots / missing-data fallback use the
same browser runtime. No calculation server is required for the production app.

```text
CURRENT PRODUCTION
Netlify static hosting (SPA, WASM, assemblies and ephemeris assets)
  ↓
Vite browser SPA
  ↓
.NET 10 Browser WASM (one shared lazy initialization)
  ↓
SharpAstrology.HumanDesign 1.2.0
  ↓
SharpAstrology.SwissEph 0.5.1
  ↓
pinned file-based Swiss Ephemeris .se1 files
```

`allowMoshierFallback: false`: missing Swiss files or calculation failures report
an error; there is no fallback to another astronomical engine or external API.
The 2021–2036 annual transit data was regenerated with SharpAstrology + Swiss.
The native generator and browser runtime share the C# transit core; Timeline
loads verified annual data and uses the same browser Sharp runtime when that data
is unavailable. See [the migration record](SHARP_ENGINE_MIGRATION.md).

Derived application logic is maintained by TD-OHD locally:

```text
TD-OHD local modules
├─ Gene Keys
├─ Connection
├─ Penta / Team
├─ transit overlay analysis and topology
└─ canonical HD static catalogs (GATES / CHANNELS / CENTERS and vocabulary)
```

The astronomical / HD activation engine, these local derived modules, and product
services (Auth / Sync / MCP) are separate layers. NatalEngine 1.6.0 is a historical
source, not a runtime dependency: package and lockfile entries, runtime / test /
script imports and the seconds patch have been removed. Its third-party source
and MIT attribution remain in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

```text
OPTIONAL / FUTURE CLOUD PLATFORM — not current production
Cloudflare Worker
├─ authentication
├─ birth-profile sync
├─ OAuth / MCP
└─ optional server-side chart endpoints
   └─ explicit compatible env.SHARP_ENGINE host adapter required
```

No Cloudflare Worker calculation backend was deployed as part of the migration.
Computational paths used by `worker/mcp.js`, `worker/og.js` and `worker/seo.js`
require an explicit `env.SHARP_ENGINE` host adapter through
`worker/chart-provider.js`. Birth and transit require `calculateBirth` and
`calculateTransit`; optional astrology also requires `calculateAstrology`.
The migration does not provision a server-side Sharp runtime. Without the required
adapter method, computation fails explicitly; it does not silently use the old
engine, another astronomical engine, or fabricated results. Static catalog and
non-computational routes do not need this adapter.

## The destination (historical cloud platform plan)

A person asks their AI: *"Pull up my partner's chart — are we electromagnetic anywhere?"*
— and it just works, because they connected Open HD to Claude once, months ago.

Three experiences, in priority order:

1. **Anonymous (default, sacred)** — enter a birthday, get a chart, instantly. No wall,
   no account, no calculation backend dependency for core flows. The current static
   app downloads its WASM and pinned Swiss assets before calculation.
2. **Signed in (optional)** — saved people sync across devices. Sign-in is a *convenience
   upgrade*, surfaced lazily ("sync across devices / connect your AI"), never a gate.
3. **AI-connected (the magic)** — a hosted, user-scoped MCP server. Connect once via
   OAuth from Claude/ChatGPT/Cursor; your AI can then list your people, compute any chart,
   compare two people, check transits — on demand, from stored birth data.

## The load-bearing insight

**Charts are never stored.** Stored profiles contain birth data, and charts are
deterministically recomputed from that data. The current browser calculation uses
SharpAstrology.HumanDesign + SharpAstrology.SwissEph + file-based Swiss Ephemeris
through .NET Browser WASM. Cloud sync, when enabled on a configured optional
platform, persists birth profiles rather than chart calculation results.
Consequences for that optional platform:

- The backend is tiny: `users`, `people`, OAuth tokens. No chart cache, no invalidation,
  no chart-result migrations when the engine improves. Recomputations use the
  configured engine and ephemeris versions; correctness is verified separately.
- The storage contract minimizes data: birth profiles only, no derived charts.
- Browser and native annual generation share the Sharp transit core. A future MCP
  compute host must explicitly supply a compatible Sharp + file Swiss adapter;
  shared server/browser versions are a requirement, not a deployed guarantee.

## Historical decision: Cloudflare cloud platform (not current production)

In the June 2026 planning exercise, three architectures were designed and judged
(CF-native / Supabase-centric / local-first purist). **Cloudflare-native won 3/3** on the lenses that matter here (solo-maintainer ops,
MCP quality with real clients, cost, open-source ethos). Why:

| Factor | Cloudflare | Supabase |
|---|---|---|
| Remote MCP | Flagship use case: `agents` SDK `McpAgent`, Streamable HTTP, `workers-oauth-provider` (OAuth 2.1 + DCR + discovery, v0.7.x, production-grade) | Possible on Edge Functions; OAuth-IdP feature is beta (Nov 2025), MCP auth glue is hand-assembled today |
| Always-on cost | **$0–5/mo** (DOs free since Apr 2025; D1/Workers free tiers cover hobby→10k users) | **$25/mo floor** — free tier pauses projects after 7 days of DB inactivity, disqualifying for an always-on MCP endpoint |
| Ops | ONE Worker, ONE `wrangler deploy`, ONE log stream | Two platforms (static host + Supabase) |
| Auth | better-auth on Workers+D1 (magic link, Google/Apple, passkeys later) — more DIY | Turnkey, best-in-class (anonymous-upgrade-in-place is genuinely elegant) |
| Current engine/runtime characteristics | SharpAstrology uses .NET 10 Browser WASM and file-based Swiss assets delivered by the static host. The current Netlify app needs no server. Optional Worker compute needs an explicit Sharp host adapter; the old in-process bundle assumption is superseded. | No Supabase Sharp host/runtime was supplied or validated by this migration. |

Supabase's one real edge — fastest path to turnkey sync — doesn't outweigh the $25 floor
and the hand-rolled MCP auth seam, given that the MCP *is the headline feature*.

**Historical client assessment (June 2026; not revalidated here):** Claude supports custom remote connectors on ALL plans
(Free gets 1) — paste URL, browser OAuth consent. ChatGPT: developer mode, all plans.
Cursor: one-click + OAuth. Current spec: 2025-06-18, Streamable HTTP, OAuth 2.1 + PKCE,
RFC 9728 protected-resource metadata, RFC 8707 resource indicators, DCR (RFC 7591 — what
Notion/Linear/Stripe actually ship; CIMD later). The demand side is consumer-ready *now*.

## Architecture: production and optional cloud services

The current production diagram is in **Current runtime architecture** above.
Netlify delivers the static app; browser WASM performs chart calculations.
The following router describes the optional cloud platform code / plan, not an
active TD-OHD production calculation backend:

```text
Optional Cloudflare Worker
├─ Static Assets                       → optional SPA hosting
├─ /api/auth/*                         → better-auth
├─ /api/sync                           → D1 birth-profile sync
├─ /mcp                               → MCP handlers
├─ OAuth / discovery routes            → optional account integration
└─ computational MCP / OG / SEO paths  → explicit env.SHARP_ENGINE host adapter
```

Auth, sync and MCP provisioning remain separate from astronomical computation.
The browser WASM runtime is not automatically imported into a Worker. A compatible
server Sharp host must be supplied and validated before cloud compute is usable.

### Storage seam (already built)

TD-OHD maintains its own birth-profile persistence and PeopleStore seam:
`src/lib/profile-storage.js` handles browser profiles, and `src/lib/people.js`
provides the application-facing store. Existing saved records survive migration.
The optional cloud plan uses two roles:

- **LocalStore** — today's localStorage. Always the live source of truth for the UI
  (instant, optimistic, offline-correct).
- **SyncStore** — decorator added when signed in: queues pushes, merges pulls. `main.js`
  consumes the store seam.

`VITE_OHD_API_BASE` unset → all sync code dead-paths → the app remains a pure static
site for self-hosters. **The backend is an enhancement, never a dependency.**

### Schema (D1) — TD-OHD stored birth-profile contract

This optional cloud storage schema mirrors TD-OHD's stored birth-profile contract.
It persists birth data and profile metadata, not chart calculation results, and
is independent of the astronomical engine. The schema design is unchanged.

```sql
CREATE TABLE people (
  id            TEXT NOT NULL,          -- client-generated UUID (same id as localStorage)
  user_id       TEXT NOT NULL,          -- better-auth user
  name          TEXT NOT NULL,
  birth_date    TEXT NOT NULL,          -- YYYY-MM-DD
  birth_time    TEXT NOT NULL,          -- HH:MM
  time_unknown  INTEGER NOT NULL DEFAULT 0,
  loc_lat REAL, loc_lon REAL,
  loc_timezone  REAL,                   -- UTC offset at birth (.5/.75 possible)
  loc_iana TEXT, loc_name TEXT,
  ai_access     INTEGER NOT NULL DEFAULT 0,  -- per-person MCP exposure (explicit opt-in)
  content_hash  TEXT,                   -- hash(birth fields) → dedupe hint
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,          -- LWW key (server-stamped on accept)
  deleted_at    TEXT,                   -- tombstone; never hard-delete during sync
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_people_user_updated ON people(user_id, updated_at);
```

### Sync: LWW with tombstones (deliberately boring)

≤50 independent records, single-writer-mostly, no cross-record invariants → last-write-wins
on `updated_at` is *correct*, not a compromise. CRDTs are overkill.

- Push: per-record deltas; server upserts iff `incoming.updatedAt > row.updated_at`;
  tombstones beat older edits; server stamps accepted writes with server time.
- Pull: rows where `updated_at > since` (incl. tombstones); same LWW applied into localStorage.
- **First-sign-in merge**: push everything local (idempotent upsert by client UUID), pull
  the union. Same person saved on two devices converges automatically; identical
  `content_hash` rows surface a gentle "looks like a duplicate" merge hint.
- No server-side anonymous users — anonymous stays *truly local* (no MAU churn, no shadow
  accounts). Sign-in is the moment data first leaves the device, and the UI says so.

### MCP server (optional cloud platform)

The June design proposed `McpAgent` and Durable Objects. The current repository
instead exposes `handleMcpRequest` in `worker/mcp.js` using stateless Streamable
HTTP; `worker/index.js` wraps routing with `workers-oauth-provider`. The optional
auth integration uses better-auth, intending SPA and MCP identity to share one user.
This section preserves the cloud integration design; it is not a production
readiness claim. Compute handlers require the Sharp host adapter described above.

**Tool design principle: the right number is "one tool per human intent."** Not one per
engine function (overwhelming — the engine has dozens), not one mega-tool (un-promptable).
Every tool is one-shot: it answers a whole question in a single call, with interpretive
text inlined. A shared `BirthInput` shape keeps them coherent:

```
BirthInput = { birthDate, birthTime?, place? }        // place geocoded + tz-resolved server-side
           | { birthDate, birthTime?, lat, lon, utcOffset }
           | "Saved Name"                              // Phase 4+, signed-in only
```

> **Historical decision 2026-06-06: hosted MCP requires sign-in.**
> The proposed anonymous endpoint would undercut the planned metering model.
> The former `npx natalengine-mcp` escape hatch is a superseded architecture note,
> not a current TD-OHD recommendation or dependency. The proposed
> `openhumandesign.com/mcp` URL is part of that historical brand/platform plan,
> not the current production site. Self-hosted Worker computation now requires an
> explicit compatible Sharp host adapter; the static app remains the local option.

**The five compute tools** (deterministic math; metered at 1 unit each):

| Tool | Intent it answers | Metered |
|---|---|---|
| `compute_chart({birth, systems?, detail?})` | "What's the chart for someone born …?" — HD by default; `systems` adds `gene_keys` / `astrology` (multi-system from day one) | 1 unit |
| `compare_charts({personA, personB})` | "How do these two people fit?" — typed connection channels + composite | 1 unit |
| `get_transits({birth, date?})` | "What's the weather over this chart today?" | 1 unit |
| `analyze_team({members[]})` | "How does this group work?" — Penta roles | 1 unit |
| `get_descriptions({gates?, channels?, centers?})` | "Tell me more about Gate 34" — follow-up depth without recomputing | free |

**Phase 4 adds three** (write scope explicit, off by default):

| Tool | Intent |
|---|---|
| `list_people()` | "Who do I have saved?" — **ai_access-flagged rows only** |
| `save_person({name, birth})` | "Remember my sister's chart" — the AI becomes a way to *build* your library |
| `delete_person({person})` | Cleanup, with confirmation semantics |

`get_chart("Mom")` is not a ninth tool — saved names slot into `BirthInput`, so
`compute_chart`/`compare_charts`/`get_transits` all accept people by name once signed in.
Eight tools total, five at launch. Ambiguous names return candidates instead of guessing.

Three design rules with teeth:
- **`ai_access` is enforced in the query**, not the prompt: MCP tools can only see rows
  the user explicitly flagged. "Your AI sees exactly what you granted" is a database
  guarantee, not a policy claim.
- **Keep activation, derived logic and product services separate.** The
  astronomical / HD activation layer is SharpAstrology + file Swiss Ephemeris.
  Gene Keys, Connection, Penta, transit topology and vocabulary belong to TD-OHD's
  local modules. Auth, sync, people and `ai_access` belong to the product service
  layer. Worker compute uses an explicitly supplied compatible Sharp host adapter;
  it does not directly import a JavaScript astronomy calculator or stdio server.
- **One-shot tools.** Each tool answers a whole human intent in one call — `get_chart`
  inlines the relevant interpretive text so the AI rarely needs a follow-up. Fewer
  round-trips = better answers, less context burn, and fair metering (below).

### Multi-system from day one (the suite question, deferred correctly)

The people store remains system-agnostic because it stores birth data only.
The historical plan was to expose multiple systems through one account/MCP layer
before adding separate frontends. Currently, HD activations come from Sharp and
Gene Keys is a local derived module. Optional server astrology requires the host's
explicit `calculateAstrology` implementation; this migration does not claim a
production Western/Vedic astrology service. The future suite, shared accounts,
people store and specialty frontends remain planned product directions.

### Privacy ladder (historical optional cloud design)

The June design assumed that server-side computation would need plaintext birth
data and proposed a separate encrypted sync-only tier. Its planned UI ladder was:

1. **Default**: "Your birth data stays on your device." (true, literally)
2. **Sync on**: "Stored encrypted-at-rest so your devices stay in sync. We store only
   birth data — never charts, never derived traits. We can technically read it; we never
   sell it or train on it."
3. **AI Access (per person)**: "Lets your connected AI compute this person's charts."
4. *(Phase 5, optional)*: true-E2E "sync without AI" tier — passphrase, AES-256-GCM,
   server stores ciphertext — for privacy maximalists, mutually exclusive with MCP.

## Pricing (historical plan, decided 2026-06-04; not a live offering)

**$3/month or $20/year** — for the cloud, never the app.

| | Anonymous | Free account | Paid |
|---|---|---|---|
| The app (charts, transits, connection, team) | ✅ unlimited forever | ✅ | ✅ |
| Local saves (device) | ✅ unlimited | ✅ unlimited | ✅ unlimited |
| Synced people | — | 10 | unlimited |
| MCP/API chart-units | — | 50/mo | unlimited (fair use) |

- **Metering counts chart-units, not raw calls.** Navigational/metadata tools are free
  (`list_people`, `get_descriptions`, search); only chart-computing tools cost 1 unit
  (`get_chart`, `compute_chart`, `compare` = 1, `transits`, `team`). With one-shot tool
  design, "pull up Mom's chart" = exactly 1 unit. User-facing language: *"a query ≈ one
  chart."* Implementation: a monthly counter column in D1.
- Rationale: the market hates paywalls (RESEARCH.md §1.3); we charge only for what runs
  on our servers. Annual ($20) keeps Stripe fees ~4% (vs ~33% at $1/mo). Infra floor is
  $5/mo → subscriber #3 makes the platform self-sustaining in that historical model.
  The earlier Worker CPU benchmark belonged to the superseded engine architecture
  and does not establish Sharp host costs. No new performance or pricing estimate
  is asserted here.

## Brand & domain architecture (historical platform/brand plan, 2026-06-04)

The names, domain ownership/availability notes and connector copy below record
June's planning assumptions. They are not current deployment facts. The current
production URL is `https://td-ohd.netlify.app/`; this migration did not provision
the proposed account, MCP or specialty domains.

- **Consumer apps get specialty domains.** This app: `openhumandesign.com` (checked
  available 2026-06-04 — register in the same Cloudflare account that runs the Worker).
  Future astrology/Gene Keys frontends get their own names. Specialty positioning wins
  (RESEARCH.md); an umbrella consumer brand would dilute it.
- **Historical umbrella brand proposal:** `natalengine.com` was recorded as
  already owned; `accounts.natalengine.com` and `mcp.natalengine.com` were proposed
  for OAuth and MCP. Proposed connector copy was *NatalEngine — your people's
  charts, any system*, with "sign in with your NatalEngine account" as a future
  cross-app story. These names describe the old brand plan, not the current engine
  dependency or a deployed TD-OHD account/MCP service.
- **Naming caution:** the bare "OpenHD" shorthand collides with an established FOSS
  project (OpenHD, drone video — openhdfpv.org). Use the full "Open Human Design"
  wordmark; don't tattoo the abbreviation. (The name itself is still being felt out —
  the positioning below survives a rename.)

### Earning "Open"

1. **Open knowledge** — the deepest claim: HD has been IP-gatekept for 30 years; giving
   away the paywalled depth in original language is an open-access stance toward the
   system itself (legally grounded — 2020 Florence ruling, 17 USC 102(b)).
2. **Open data** — local-first default, export/import, shareable URLs, only birth data
   ever stored, trivially portable.
3. **Open interface** — the MCP/API contract is public; we charge for hosting, not access
   to the interface.
4. **Open engine** — the historical plan cited NatalEngine's MIT npm library.
   Current calculation uses SharpAstrology + Swiss; licensing and source attribution
   are recorded in `THIRD_PARTY_NOTICES.md`. Competing frontends remain welcome.
5. **Self-hosting as credible exit** — the static app runs with the backend env unset,
   forever. HD users mostly won't self-host; the point is the *guarantee* (our cloud must
   earn its keep), not the practice.

## Build phases (historical cloud roadmap; not current production status)

These June 2026 milestones and effort estimates are retained as the planning
record. Historical code/test completion does not establish current deployment or
Sharp server compute readiness. The current static runtime is described above.

| Phase | What | Effort |
|---|---|---|
| **0** | ✅ *done 2026-06-04* — `PeopleStore` seam in `src/lib/people.js` (no behavior change; protects self-hosters) | ~0.5 day |
| **1** | ✅ *code done 2026-06-04* — `wrangler.jsonc` + `worker/index.js` (Workers Static Assets, SPA fallback); **deploy pending `wrangler login` + domain** | ~0.5–1 day |
| **2** | *Historical code milestone 2026-06-04* — `worker/mcp.js` handlers and workerd tests existed under the earlier engine architecture. Current computational handlers require `env.SHARP_ENGINE`; migration did not deploy or provision a server Sharp runtime. Real connector validation remains a deployment gate. | ~2–4 days |
| **3** | better-auth (magic link + Google + Apple) + D1 schema + LWW sync + SyncStore + lazy sign-in UI | ~3–5 days |
| **4** | **User-scoped MCP** — `list_people`/`get_chart` over D1 with `ai_access` gating + name resolution → *"pull up Mom's chart" works* | ~2–3 days |
| **5** | Passkeys, dedupe UI, E2E no-AI tier, Turnstile, legacy `/sse` compat, privacy copy polish | ongoing |

≈ 8–13 focused days to the full destination; the headline MCP demo lands at Phase 2.

**Cost**: $0 on free tiers; $5/mo Workers Paid recommended for production headroom.
(Supabase equivalent: $25/mo floor because free projects pause after 7 idle days.)

## Known sharp edges (optional cloud integration notes)

- **better-auth on Workers**: must use a per-request `createAuth(env)` factory — the
  documented module-singleton silently breaks (D1 binding changes per invocation).
- **MCP token hygiene**: validate `aud` on every request (RFC 8707 binding); never pass a
  client's token downstream; KV-stored tokens via workers-oauth-provider are hashed.
- **Name resolution** ("Mom"): match against saved names; ambiguity → the tool returns
  candidates and asks. Aliases can come later.
- **Team/Enterprise Claude** requires an org Owner to add custom connectors — individual
  plans (incl. Free, 1 connector) are the launch audience.

## The Parachute vision (historical future roadmap; no current integration claim)

What this platform does — personal data + scoped tokens + "my AI can just access it" —
is Parachute Computer's thesis in miniature. The full vision has three horizons:

**Horizon 1 (planned): an open API for a Parachute setup.**
The historical vision is a Parachute Runner writing transit notes, an agent
computing charts, or a custom chart UI. These integrations depend on a configured
service, its access policy and an explicit compatible Sharp compute host. No
public production computation endpoint or Parachute integration is established
by this migration. The static browser app is available now; the API path remains
optional future work.

**Horizon 2: people-as-vault-data.** The `PeopleStore` interface and the MCP tool
contract are the two storage-agnostic seams. A Parachute-backed implementation slots in
behind them: saved people as vault documents, AI access via hub-minted scoped tokens
instead of our OAuth — your birth-data library living in *your* vault, with OpenHD as
one client of it.

**Horizon 3 (convergence milestone): OpenHD accounts *are* Parachute vaults.** When
Parachute has consumer-grade multi-tenant onboarding, the D1 store can be swapped for
vault storage wholesale and OpenHD becomes Parachute's first consumer showcase — proof
that "your data, your agents, your tools" works for people who will never say the word
"self-host." Until then, D1 is the boring, correct choice; nothing built now is thrown
away (the Worker swaps its storage adapter; the tool contract never changes).
