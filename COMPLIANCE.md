# MadeBy — Bookkeeping & Compliance

> Companion to `PROVISIONING.md`. Forming the C-corp (via Atlas) switches on a recurring
> compliance calendar plus bookkeeping. **Not tax/legal advice** — execute this *with* a CPA,
> and confirm current rules (tax law here shifts, notably FinCEN BOI).

## Decisions (locked / pending)

| Choice | Decision |
|---|---|
| Bookkeeping | **Puzzle** (Starter — **free until $20k transaction volume**, then ~$25/mo), auto-synced to Mercury + the company card |
| Tax filings | **A Puzzle-certified startup tax firm** (frontrunner: **Accountalent**) **or Inkle** (~$750/yr tax-only) — *pending quotes*. Hybrid model: software for books + firm for annual filings |
| Ruled out | **Pilot** tax (requires its own bookkeeping); **Kruze/Burkland** (over-scoped/expensive for now) |
| Entity | Delaware C-corp via Stripe Atlas (see `PROVISIONING.md`) |

## ⚠️ Most urgent — 83(b) election

If the Atlas founder stock is subject to **vesting**, each founder must file an **83(b) election
with the IRS within 30 days of the stock grant** — no extensions, large tax consequences if
missed. Atlas prompts it. **This is the highest-priority post-formation task.** (If stock is
fully vested at grant, it's moot — confirm which you have.)

## Compliance calendar

| When | Obligation | Notes |
|---|---|---|
| **+30 days** of stock grant | **83(b) election** (each founder) | one-time, critical (above) |
| At formation | Confirm **FinCEN BOI** status | a **March 2025 interim rule exempted US domestic entities** — likely no filing for a US C-corp, but **confirm current** |
| **March 1** (annual) | **Delaware franchise tax + annual report** | use the **assumed-par-value-capital method** (min ~$400), not authorized-shares (can balloon); Atlas structures shares for this |
| **~April 15** (annual) | **Federal Form 1120** + **state income return** (operating state) | files even at $0 revenue; losses carry forward (NOLs) |
| **Jan 31** | **1099-NEC** for any contractor paid $600+ | only if you hire help |
| ongoing | **DE registered agent** renewal (Atlas) · **foreign-qualify** in the operating state | depends where you physically operate |

## Bookkeeping conventions (keep the books clean from day one)

- **All spend on the company card; nothing personal.** Log the early personal-fronted charges
  (Workspace, Cloudflare) for reimbursement once the Atlas bank lands.
- **Puzzle auto-syncs Mercury** — categorize monthly; keep receipts; maintain a clean chart of
  accounts (tag infra/SaaS distinctly). Clean books = painless filings + due diligence later.

## Deferred until they apply

- **Quarterly estimated taxes** — only once profitable (pre-revenue at a loss: none due).
- **Payroll taxes** — once founders take salary or you hire.
- **Sales tax** — once there are paying customers (SaaS is taxable in many states); handle with
  **Stripe Tax / Anrok** when nexus appears.
- **R&D tax credit** — once spending/payroll grows (can offset payroll tax).
- **QSBS** — the 5-year clock runs from the Atlas stock issuance (see `PROVISIONING.md`).

## Division of labor

- **Yours:** file the 83(b), pick + engage the tax firm, set up Puzzle, confirm operating-state
  nexus.
- **Mine:** this doc + the calendar; and once Atlas gives a formation/grant date, **set
  scheduled reminders** for the 83(b) +30-day deadline and the annual March 1 / April 15 dates.
