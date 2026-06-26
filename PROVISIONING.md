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

## Dependency order — email first, then everything under `mac@madeby.fyi`

We stand up **email first** so that *every* account afterward — Cloudflare, Atlas, providers —
is created under `mac@madeby.fyi`, never a personal address. The chicken-and-egg (Workspace
needs DNS records; Cloudflare needs an email) resolves cleanly: **verify Workspace via records
at Gandi** (where DNS lives now), then create the Cloudflare account under `mac@` and let
Cloudflare **import** those Gandi records when you add the domain.

```
1. Google Workspace  → mac@/hello@/security@; verify + records AT GANDI       (you; records below)
2. Cloudflare        → create acct with mac@madeby.fyi; add domain (imports
                       Gandi records); switch nameservers at Gandi → Cloudflare (you)
3. Stripe Atlas      → register with mac@madeby.fyi → C-corp + EIN + bank + card (you; ~days)
4. Secondary domains → add to Cloudflare + 301 redirects                       (you + rule below)
5. Providers         → register with mac@madeby.fyi + the Atlas card
6. Wire env → deploy apps/web → run Drizzle migration                          (me, once 5 exists)
```

Steps 1–2 are free/$7 — front Workspace on a personal card (or its trial) and reimburse once
the Atlas bank lands. Atlas (step 3, the ~days-long pole) then runs with the company email.

---

## Step 1 — Google Workspace email (verify via Gandi)

DNS is still at Gandi at this point, so Workspace is verified there — no Cloudflare needed yet.

1. Sign up for Workspace for `madeby.fyi` (use a personal/contact email for the signup process;
   the **primary admin becomes `mac@madeby.fyi`**). Create `mac@`, `hello@`, `security@`.
2. Add these records **at Gandi** (deterministic ones filled in; `<…>` are service-generated):

| Type | Name | Value | Notes |
|---|---|---|---|
| MX | `madeby.fyi` | `1 smtp.google.com` | Modern single-record Workspace MX |
| TXT | `madeby.fyi` | `v=spf1 include:_spf.google.com ~all` | SPF |
| TXT | `_dmarc.madeby.fyi` | `v=DMARC1; p=none; rua=mailto:security@madeby.fyi; fo=1` | Start `p=none` (monitor); tighten to `quarantine`→`reject` later |
| TXT | `google._domainkey.madeby.fyi` | `<DKIM value from Admin console>` | Enable DKIM (2048-bit) in Google Admin → Apps → Gmail → Authenticate email |
| TXT | `madeby.fyi` | `google-site-verification=<token>` | If verifying by TXT (or verify via the MX setup) |

> Legacy fallback if the single MX isn't offered: the five `ASPMX*.GOOGLE.COM` records.
> For a trust product, getting SPF + DKIM + DMARC clean early is worth it — and `security@` is
> the address researchers will expect for vulnerability reports.

## Step 2 — Cloudflare DNS (account under `mac@`, import, delegate)

1. Create the **Cloudflare account using `mac@madeby.fyi`** (now that it exists).
2. **Add a site** → `madeby.fyi` (Free plan). Cloudflare **scans and imports the existing Gandi
   records** (including the Workspace MX/SPF/DKIM/DMARC from Step 1) — confirm they came across.
3. Cloudflare shows **two nameservers**; in **Gandi**, switch `madeby.fyi` nameservers to those.
4. Wait for propagation; Cloudflare shows "Active". Mail keeps flowing (records were imported).

(Registration stays at Gandi. Transferring to Cloudflare Registrar later is optional/at-cost.)

## Step 3 — Stripe Atlas (entity + EIN + bank + cap table)

Register at atlas.stripe.com **using `mac@madeby.fyi`**. Outputs: a Delaware C-corp, EIN, a bank
account (Mercury/Brex), and a clean cap table / founder stock. **This collapses the entity →
EIN → bank steps.** Note the QSBS clock starts at stock issuance.

## Step 4 — Secondary domains → 301 redirects

For each of `madebyhi.fyi`, `madebyai.fyi`, `madewithai.fyi`, `madewith.fyi`: add to Cloudflare
(delegate NS from Gandi, same as Step 2), then a **Redirect Rule**:

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

- **Yours (identity-verified):** the Workspace tenant + records at Gandi, the Cloudflare
  account + nameserver switch, Atlas, each provider signup + payment.
- **Mine (now / as creds arrive):** this runbook + the DNS record set above, the GitHub org
  layout + App manifest, `.env` wiring, and the deploy + migration (Step 6).
