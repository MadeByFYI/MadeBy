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
| Founders / stock | **Solo founder, 100% to Mac; stock fully vested at grant (no vesting)** → **83(b) is N/A** (see below). Bank: **Mercury** |

## ⚠️ 83(b) election — N/A as structured, with one thing to verify

Founder stock is being issued **fully vested with no vesting schedule** (locked decision), so
there is **no substantial risk of forfeiture and nothing to elect** — **no 83(b) filing is
required.** This removes what is normally the most time-sensitive post-formation task.

> **Verify at signing (the one caveat):** confirm the Atlas stock purchase docs include **no
> repurchase right / forfeiture restriction**. If any such restriction is present, the **83(b)
> 30-day clock applies after all** (file with the IRS within 30 days of grant, no extensions) —
> in that case treat it as the top priority and tell me the grant date so I set the reminder.

## Compliance calendar

| When | Obligation | Notes |
|---|---|---|
| **+30 days** of stock grant | **83(b) election** | **N/A** as structured (fully vested, no vesting) — applies *only* if a repurchase right is present (verify at signing) |
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

## Product-liability legal pack (formation deliverable — review 2026-06-29, Finding 4)

This runbook covers *entity/tax*; it was **silent on product liability**, which is the larger
exposure for a product that publishes inferences about third parties. (We **no longer host** sworn
legal attestations — decision 2026-07-06, `ARCHITECTURE.md §3`: users self-host a legally-signed
declaration in their own repo, we detect it and store a pointer. This removes the
attestation-hosting exposure entirely; the inference-publishing exposure remains and is unchanged.)
Forming the entity without this layer leaves the highest-liability surfaces legally naked. Engage
counsel **at formation** for:

- **Terms of Service + Acceptable Use Policy** — including the "we order evidence, we don't
  adjudicate" posture and prohibited-use terms for the free assert tier.
- **Privacy policy + GDPR/DPA review** — git author emails + behavioral inference are personal
  data; cover lawful basis, right to object, and accuracy duties on *inferred* data (ties to the
  consent/opt-out design, `ARCHITECTURE.md` §8/§11).
- **DMCA/takedown agent registration + intermediary-liability / safe-harbor posture** — before any
  public, name-attached pages ship.
- **Counsel on the sworn tier specifically** — now a *narrower* scope since we don't host the
  declarations (`ARCHITECTURE.md §3`): vet **our published template wording** (does a self-hosted,
  legally-signed declaration clear the "sworn"/consequential bar, and in which jurisdictions), the
  **detector/pointer disclaimer** (we index a fact, we don't republish the claim), and the "powerful
  actor files a false sworn claim" case. MadeBy-as-detector-not-notary. The sworn tier does **not**
  launch until this clears (`STRATEGY.md` §2).
- **`security@` + `privacy@` contacts** live before launch.

## Deferred until they apply

- **Quarterly estimated taxes** — only once profitable (pre-revenue at a loss: none due).
- **Payroll taxes** — once founders take salary or you hire.
- **Sales tax** — once there are paying customers (SaaS is taxable in many states); handle with
  **Stripe Tax / Anrok** when nexus appears.
- **R&D tax credit** — once spending/payroll grows (can offset payroll tax).
- **QSBS** — the 5-year clock runs from the Atlas stock issuance (see `PROVISIONING.md`).

## Division of labor

- **Yours:** verify no repurchase right at signing (else 83(b) is back on), pick + engage the tax
  firm, set up Puzzle, confirm operating-state nexus.
- **Mine:** this doc + the calendar; and once Atlas gives a formation/grant date, **set
  scheduled reminders** for the annual March 1 / April 15 dates (plus the 83(b) +30-day deadline
  *only if* a repurchase right turns up). Record the stock-issuance date (starts the QSBS clock).
