# MadeBy — Provisioning Runbook

> The ordered, real-world setup that #7 technical provisioning depends on. Companion to
> `OPERATIONS.md` (which says *what* infra we run and *why*); this says *how to stand it up*.
> Practical guidance, not legal/tax advice — confirm specifics with your CPA/attorney.

## Decisions (locked)

| Choice | Decision |
|---|---|
| Entity | **Delaware C-corp**, formed via **Stripe Atlas** (bundles C-corp + EIN + bank partner + cap table) |
| Banking | Atlas partner (**Mercury** / Brex) — virtual card is the single payment method for all vendors |
| Email | **Google Workspace** on `madeby.fyi` (`mac@` / `hello@` / `security@`) — also team SSO |
| DNS | **Cloudflare DNS** (registration stays at **Gandi**; delegate nameservers) |
| Domains | `madeby.fyi` (hub) + `madebyhi.fyi` / `madebyai.fyi` / `madewithai.fyi` / `madewith.fyi` → **301 → madeby.fyi** |

## Dependency order — email first

We stand up the **company email before Atlas** so that Atlas (and every later signup) is
registered under `mac@madeby.fyi`, not a personal address we'd have to migrate off later.

```
1. Cloudflare DNS    → add madeby.fyi, delegate nameservers from Gandi   (you + records below; now, free)
2. Google Workspace  → mac@ / hello@ / security@ on madeby.fyi           (you; records below)
3. Stripe Atlas      → register with mac@madeby.fyi → C-corp + EIN + bank + card   (you; ~days)
4. Secondary domains → add to Cloudflare + 301 redirects                 (you + rule below)
5. Providers         → register with mac@madeby.fyi + the Atlas card
6. Wire env → deploy apps/web → run Drizzle migration                    (me, once 5 exists)
```

Steps 1–2 are free/$7 — front Workspace on a personal card (or its trial) and reimburse once
the Atlas bank lands. Atlas (step 3, the ~days-long pole) then runs with the company email.

---

## Step 1 — Cloudflare DNS (delegate from Gandi)

1. Cloudflare → **Add a site** → `madeby.fyi` (Free plan). Cloudflare assigns **two nameservers**
   (e.g. `xxxx.ns.cloudflare.com`, `yyyy.ns.cloudflare.com`) — capture them.
2. **Gandi** → `madeby.fyi` → Nameservers → switch to "external" and enter Cloudflare's two NS.
3. Wait for propagation (minutes–hours); Cloudflare shows the domain "Active".
4. Apply the records in Step 2.

(Registration stays at Gandi. Transferring to Cloudflare Registrar later is optional/at-cost.)

## Step 2 — Google Workspace email + DNS records

Set up Workspace on `madeby.fyi` (needs a card to start — front it personally for now); create
`mac@`, `hello@`, `security@`. Then add these records in Cloudflare DNS (the deterministic ones
are filled in; `<…>` are service-generated):

| Type | Name | Value | Notes |
|---|---|---|---|
| MX | `madeby.fyi` | `1 smtp.google.com` | Modern single-record Workspace MX |
| TXT | `madeby.fyi` | `v=spf1 include:_spf.google.com ~all` | SPF |
| TXT | `_dmarc.madeby.fyi` | `v=DMARC1; p=none; rua=mailto:security@madeby.fyi; fo=1` | Start at `p=none` (monitor); tighten to `quarantine`→`reject` later |
| TXT | `google._domainkey.madeby.fyi` | `<DKIM value from Admin console>` | Enable DKIM (2048-bit) in Google Admin → Apps → Gmail → Authenticate email |
| TXT | `madeby.fyi` | `google-site-verification=<token>` | If verifying by TXT (or verify via the MX setup) |

> Legacy fallback if the single MX isn't offered: the five `ASPMX*.GOOGLE.COM` records.
> For a trust product, getting SPF + DKIM + DMARC clean early is worth it — and `security@` is
> the address researchers will expect for vulnerability reports.

## Step 3 — Stripe Atlas (entity + EIN + bank + cap table)

Register at atlas.stripe.com **using `mac@madeby.fyi`**. Outputs: a Delaware C-corp, EIN, a bank
account (Mercury/Brex), and a clean cap table / founder stock. **This collapses the entity →
EIN → bank steps.** Note the QSBS clock starts at stock issuance.

## Step 4 — Secondary domains → 301 redirects

For each of `madebyhi.fyi`, `madebyai.fyi`, `madewithai.fyi`, `madewith.fyi`: add to Cloudflare
(delegate NS from Gandi, same as Step 1), then a **Redirect Rule**:

- **When:** `http.host` matches the domain
- **Then:** Dynamic 301 → `concat("https://madeby.fyi", http.request.uri.path)` (preserves path)

Keeps the brand consolidated on `madeby.fyi` while holding the others defensively.

## Step 5 — Technical providers

Register each with **`mac@madeby.fyi`** + the **Atlas company card**. Each yields env values
(see `.env.example`):

| Provider | Role (OPERATIONS.md §4) | Env it produces |
|---|---|---|
| **Cloudflare** | CDN + R2 (zero-egress) + badge Worker | `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` |
| **Vercel** | `apps/web` hosting (hot path) | (project link; sets `NEXT_PUBLIC_BASE_URL`) |
| **Neon** | Postgres + pgvector (registry) | `DATABASE_URL` |
| **Modal** | cold-path compute (ingestion/fingerprint/classify) | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` |
| **GitHub** | org + the MadeBy App (OAuth + on-demand ingestion) | `GITHUB_CLIENT_ID/SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` |
| **Sentry / PostHog / Axiom** | errors / funnel / logs | `SENTRY_DSN`, `POSTHOG_KEY`, `AXIOM_TOKEN` |

**Set hard spend caps / budget alerts on every provider** (OPERATIONS.md §8) — a viral spike
against pay-per-use is a surprise-bankruptcy vector.

## Step 6 — Wire, deploy, migrate (me)

Once Step 5 exists: copy `.env.example` → `.env` with the values, link the Vercel project,
run the Drizzle migration against Neon (`pnpm --filter web db:migrate`), and deploy. This
unblocks **#10 ingestion**, the real (Drizzle-backed) registry, **dogfood #3**, and **#15**.

---

## Division of labor

- **Yours (identity-verified):** Cloudflare signup + switching nameservers at Gandi, the
  Workspace tenant, Atlas, each provider signup + payment.
- **Mine (now / as creds arrive):** this runbook + the DNS record set above, the GitHub org
  layout + App manifest, `.env` wiring, and the deploy + migration (Step 6).
