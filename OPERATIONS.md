# MadeBy — Operations & Infrastructure

> Companion to `STRATEGY.md` (why), `ARCHITECTURE.md` (what/how), `TESTING.md` (how we keep it
> trustworthy), and `PROVISIONING.md` (the one-time runbook to stand the infra up). This doc is
> *how we run it*: resources, the provider stack, internal dashboards, cost governance, and the
> security posture. It serves a different reader (whoever is on call / paying the bills).

The guiding fact: at our stage, ops is dominated by **one existential risk (the cost of the
corpus)** and **one architectural separation (hot read path vs. cold compute path)**. Almost
every decision below follows from those two.

---

## 1. Operating principles

1. **Managed services over self-hosted.** At 1–3 people we do not run our own databases,
   queues, or Kubernetes. Every component is a managed service with a generous free tier.
2. **Scale-to-zero or zero-egress, everywhere.** Idle cost ≈ $0; a viral spike costs
   per-use, not a standing fleet. Read-heavy/image-serving paths must avoid egress fees.
3. **Hard spend ceilings, not just autoscaling floors.** A Hacker News spike against
   pay-per-use compute is a surprise-bankruptcy vector. Every provider gets a budget alert
   and, where possible, a hard cap.
4. **Cost is a first-class operational metric**, watched daily, with its own dashboard.
5. **Security posture befits a trust company.** Least-privilege from day one; keyless signing
   to minimize key custody; a key/credential leak is treated as a fatal incident.
6. **Bound the corpus.** We do *not* try to ingest all of public git. (See §3.)

---

## 2. The hot/cold separation

| | Hot read path | Cold compute path |
|---|---|---|
| **Components** | resolver API, resolver pages, badge SVGs | ingestion, fingerprinting, classification, index aggregation |
| **Profile** | high-volume, latency-sensitive, always-up | batch, can lag, budget-governed |
| **Cost shape** | cheap-per-request, CDN/cache-fronted | preemptible/spot, scale-to-zero, pay-per-second |
| **In request path?** | yes | never |

Key consequence (also a product spec): a **resolver cache-miss triggers the on-demand
analyzer** ("not analyzed yet → analyze now"). The two are one system, not two.

---

## 3. The corpus cost strategy (the existential risk, managed)

Ingesting all of public git is petabytes + heavy per-file compute → bankruptcy on no budget.
We avoid it structurally:

- **The curiosity mirror is on-demand and nearly stateless** — shallow-clone, analyze,
  return, persist a claim *only if claimed*. **Cost scales with usage, not with the size of
  git.**
- **The public index is a bounded sample** (top-N repos by stars, sampled, incrementally
  refreshed). Full-corpus ingestion is a **post-traction optimization**, not a launch
  requirement. This is *why* the index is honestly labeled a sampled estimate
  (`ARCHITECTURE.md` invariant #7).
- **Don't crawl GitHub's API at scale** (rate limits + ToS). Use **GH Archive** and the
  **BigQuery GitHub dataset** for bulk/sampled corpus; use a **GitHub App** only for repos
  users actively engage with.

---

## 4. The provider stack (stake in the ground)

Deliberate, revisable bets. "Graduation" = when scale or revenue justifies moving.

### Hot read path

| Component | Choice | Why | Graduation |
|---|---|---|---|
| Web app + API (Next.js) | **Vercel** | best Next.js DX, scale-to-zero functions, fast iteration | Cloudflare Pages, or consolidate to a hyperscaler at scale |
| CDN + badge edge service | **Cloudflare** (Workers + Cache) | edge-rendered badge SVGs, generous free tier, fronts everything | — (this is the cost-control backbone) |
| Object storage | **Cloudflare R2** | **zero egress fees** — decisive for read-heavy/image serving | — |

### Data

| Component | Choice | Why | Graduation |
|---|---|---|---|
| Registry (Postgres) + similarity index | **Neon** (serverless Postgres + **pgvector**) | scale-to-zero, branching (clean read/write + preview split), pgvector means **no separate vector DB early** | dedicated similarity index (e.g. a managed vector/LSH service) only when fuzzy-lookup scale forces it; managed Postgres (Crunchy/RDS) if Neon outgrown |

### Cold compute path

| Component | Choice | Why | Graduation |
|---|---|---|---|
| Analysis + ingestion compute (clone / fingerprint / classify) | **Modal** | serverless containers, scale-to-zero, pay-per-second, optional GPU for ML classification, minimal ops | AWS Batch on spot / Fly Machines if cost profile shifts |
| Queue / job dispatch | **Upstash** (QStash + Redis) *or* **Cloudflare Queues** | serverless, pay-per-use, no broker to run | durable workflow engine (Inngest/Temporal) if orchestration grows multi-step |

### Identity, auth, signing

| Component | Choice | Why | Graduation |
|---|---|---|---|
| Auth (OAuth, GitHub-primary) | **Auth.js (NextAuth)** | free, no per-MAU cost, lives in the app | Clerk/WorkOS if enterprise SSO (SAML/SCIM) demand appears |
| Signing / proof tier | **Sigstore (Fulcio keyless via OIDC)** | short-lived certs from OIDC identity → **minimal key custody**; matches the "ride Sigstore" decision | cloud KMS/HSM only if long-lived keys become necessary |
| Secrets | platform secret stores (Vercel / Modal / Cloudflare) | no standing secrets infra | dedicated secrets manager at scale |

### Ingestion, comms, domain

| Component | Choice | Why |
|---|---|---|
| Bulk corpus source | **GH Archive + BigQuery GitHub dataset** | sidesteps API rate limits / ToS |
| Live repo access | **GitHub App** (+ OAuth) | only for repos users engage with |
| Transactional email (verification) | **Resend** | carried from v1, simple |
| DNS / domain (`madeby.fyi`) | **Cloudflare** | already the edge provider |

### Observability & internal dashboards

| Need | Choice |
|---|---|
| Errors | **Sentry** |
| Logs / events / metrics | **Axiom** (or Grafana Cloud free tier) |
| Product / funnel analytics (the flywheel) | **PostHog** (funnels, free tier, self-hostable) |
| Cost | provider billing APIs + budget alerts, surfaced in an internal admin view |
| Admin dashboards | a small **Next.js admin app** reading Neon + PostHog + billing APIs (Grafana for pure metrics panels) |

> **Why not start on one hyperscaler (AWS/GCP)?** For a tiny zero-budget team it's slower DX,
> easier to overspend, and worse scale-to-zero/egress economics than this specialized stack.
> A hyperscaler is a *consolidation target later*, not a starting point.

---

## 5. The similarity index (pgvector-first)

The fuzzy/structural fingerprint nearest-neighbor lookup is the one specialized, expensive
cost center. **Start with `pgvector` in the Neon Postgres we already have** — zero new infra.
Graduate to a dedicated vector/LSH service only when fuzzy-lookup latency or corpus size
forces it. Do not stand up specialized search infra before scale demands it.

---

## 6. Enterprise isolation: code never leaves the customer's perimeter

The org index/dashboard (the paid surface in `ARCHITECTURE.md` §8) must not pull customers'
proprietary code into our perimeter. Direction (decided now to avoid a retrofit):

- **An isolated/on-prem ingestion agent** — a container the customer runs *inside their
  boundary*. It clones, fingerprints, and classifies locally.
- **Only aggregate results / claims flow to us** — coverage numbers, tier distributions,
  fingerprints (salted where needed) — never raw source.
- This makes the enterprise security review tractable and is a genuine product
  differentiator ("your code never leaves your network").

---

## 7. Internal dashboards we need (and who powers them)

Several are product-critical, not just ops — two are the public product pointed inward.

1. **Cost dashboard** — spend by component, $/analysis, $/repo, burn vs. budget. Watched
   daily; wired to budget alerts + auto-throttles. (Billing APIs → admin app.)
2. **Flywheel funnel** — mirror runs → shares → claims → verifications → badges added → API
   calls. The **asserted→verified conversion rate is the single most important number in the
   company.** (PostHog.)
3. **Ingestion / pipeline health** — repos processed, corpus coverage (% of top-N),
   freshness/lag, queue depth, failures. (Axiom + admin app.)
4. **Classification accuracy / QA** — confidence distribution, drift, sampled human-eval, and
   a **dispute/correction queue.** Our credibility is this number's defensibility, so it is a
   product surface. (Admin app over Neon.)
5. **Resolver / API health** — latency (esp. fuzzy lookup), error rates, cache-hit ratio, QPS
   by endpoint. (Cloudflare analytics + Axiom + Sentry.)
6. **Trust & safety / abuse** — rate-limit hits, suspicious claim patterns (one actor
   claiming many repos), hash-guessing against private subjects. (Admin app + Axiom.)

---

## 8. Cost governance

- Budget alerts on every provider; hard caps where supported.
- Scale-to-zero on Neon, Modal, and Vercel functions; R2/Cloudflare to neutralize egress.
- Autoscaling **ceilings** on the analyzer (queue + per-user rate limits) so a viral spike is
  bounded, not unbounded — the abuse controls and the API metering are the same mechanism.
- The cost dashboard (§7.1) is reviewed daily while pre-revenue.

---

## 9. Graduation triggers (when these bets change)

- **pgvector → dedicated similarity index:** when fuzzy-lookup p95 latency or index size
  degrades query SLAs.
- **Sampled index → fuller corpus ingestion:** when traction/revenue funds the compute and
  coverage gaps cost us credibility.
- **Specialized stack → hyperscaler consolidation:** when integration overhead or committed
  spend makes one cloud cheaper than the sum of services.
- **Auth.js → Clerk/WorkOS:** when enterprise SSO (SAML/SCIM) demand appears.

---

## 10. Agentic ops: Claude as a first-class ops team member

> **Stage descope (review 2026-06-29).** The full design below — WIF, tiered capability brokers,
> kill switches, two-person rules — is right for a product with prod to operate, and wrong as an
> *attention allocation* for a pre-deploy company. **v0 floor: read-only metrics + propose-PR
> only.** The WIF / broker / tiered-capability / kill-switch machinery is **parked as a
> post-traction epic** (design captured here, not built now). Attention goes to the unblocked
> funnel (the in-memory mirror, the classifier) instead.

We want Claude on the ops team — reading every metric, triaging incidents, and making
changes — without compromising the trust posture the product exists to sell.

> **Unifying principle: we hold our own AI ops agent to the exact standard we sell** —
> verified identity, least privilege, tiered trust, signed + audited actions — **and we attest
> its actions through MadeBy's own provenance ledger.** Claude-ops is our first dogfood: every
> infra change is signed by its operator-bound identity and recorded in the same system we
> sell. A provenance company whose AI makes unaudited prod changes is self-refuting.

### Read access — instrument so Claude sees structured signal, not screenshots

1. **MCP read-servers over the observability stack** (§4): Axiom, Sentry, PostHog,
   Cloudflare analytics, Neon, billing APIs. Claude queries facts, not pixels.
2. **A curated SLI/SLO catalog, not raw telemetry** — named, documented metrics exposed as
   tools (`ingestion_lag`, `asserted_to_verified_rate`, `cost_per_analysis`,
   `fuzzy_lookup_p95`), each with its threshold and failure meaning. Backed by the §7 admin app.
3. **Runbooks as retrievable context** — `OPERATIONS.md` + a runbook library (failure modes,
   thresholds, escalation), so diagnoses are grounded in our playbooks.
4. **Alerts wake Claude as first responder** — budget breach / queue backup / error spike
   webhook → agent run. Claude triages, writes a diagnosis, then fixes (if in the safe set) or
   escalates with the writeup.

### Change access — two choices do most of the security work

- **A. GitOps is the primary change surface.** Claude's default way to change anything is to
  **open a PR against the IaC repo** (Terraform/Pulumi/SST), through the same CI + review +
  merge as humans. Buys audit trail, review gate, reversibility (`git revert`), blast-radius
  bounding — and means Claude usually holds *no* prod credentials, only the ability to propose
  reviewed, version-controlled diffs.
- **B. A tiered capability policy mirroring the trust tiers** for non-PR actions (each promoted
  to a dedicated, typed tool — never raw bash — so the harness can gate/render/audit):

  | Tier | Examples | Gate |
  |---|---|---|
  | **Auto** | read-only; safe reversible bounded actions (retry jobs, replay/clear queue, flush cache, scale workers within a cap, open a PR) | none |
  | **Approval-gated** | deploy to prod, schema migration, raise spend cap, rotate key, delete resource | human one-click approve |
  | **Forbidden / human-only** | drop DB, delete prod/customer data, change billing owner, touch the audit log, read raw enterprise customer code | hard boundary |

Enforcement mechanics:

- **Claude has its own scoped operator identity per provider** via Workload Identity Federation
  (same keyless posture as Sigstore signing) — short-lived creds, never long-lived secrets in
  context; every action attributable to "Claude-ops," not a shared human key.
- **A policy-enforcing broker holds credentials; Claude expresses intent.** The Managed Agents
  permission model fits: `always_ask` tools pause for a human `tool_confirmation` (= the
  approval-gated tier), and **vault credentials never enter the agent sandbox — injected at
  egress by proxy, so a prompt-injected agent cannot exfiltrate them.** This is also the
  containment for the live prompt-injection vector in **untrusted public-repo ingestion**
  (a malicious README).
- **Every action signed + attested through MadeBy's own ledger** — tamper-evident ops audit
  built on our own product.
- **Kill switch + circuit breaker** — one-command revoke of Claude's WIF identity; rate-limit
  action frequency; anomaly-detect its own behavior; two-person rule on the riskiest approvals.

Runtime: **Claude Agent SDK, manual agentic loop** (not the auto tool-runner) — the manual
loop is what permits the approval gate, audit logging, and per-tier conditional execution.
Read-only MCP servers for metrics; a guarded broker/write-MCP for actions. Model:
**`claude-opus-4-8` at high/xhigh effort** for diagnosis/planning; **`claude-haiku-4-5`** for
routine triage.

**Start conservative; let it earn the tier** (our trust ladder, applied inward): launch at
**read + propose-PR only**, expand the Auto set as track record accrues.

## 11. How ops shapes product (the arrows)

Recorded here and in the strategy/architecture docs because the user's premise was correct —
operations dictates several product specs:

- **Cache-miss → mirror**: "not analyzed yet" is a designed product state, not an error.
- **Index = declared sample**: methodology, coverage, and confidence are visible product
  elements (honesty invariant), because that's what the infra honestly produces.
- **Confidence + dispute flow is a conversion loop**: "this estimate is wrong → claim &
  correct it → verified tier." Ops QA need becomes growth.
- **Tiered freshness/coverage SLAs** fall out of cost-governed ingestion (public =
  best-effort/sampled; paid org = full + fresh).
- **Enterprise isolation is a security spec** (§6), designed in, not retrofitted.
- **Metered API + analyzer queueing** = the abuse controls and the monetization metering are
  the same mechanism.
