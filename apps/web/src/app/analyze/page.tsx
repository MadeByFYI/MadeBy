import { analyzeRepo, badgeSnippet, resolveHandles, isAnalyzeError, githubAdapter } from "@madeby/analyzer";
import "@madeby/analyzer/host/github-api"; // enable the GitHub API path (fetchProfile / resolveHandleViaApi) on this network-capable surface
import { track, FUNNEL } from "@/lib/analytics";
import { mirrorCoverage } from "@/lib/coverage";

// Clones + analyzes at request time → Node runtime, never prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n)}%`;
const wrap = { maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" } as const;

const EXAMPLES = ["github.com/octocat/Hello-World", "github.com/sindresorhus/slugify"];

function CorrectionForm({ repo }: { repo: string }) {
  return (
    <details style={{ marginTop: "1.5rem", fontSize: ".88rem" }}>
      <summary style={{ cursor: "pointer", opacity: 0.7 }}>Wrong? Tell us who really made it</summary>
      <form method="post" action="/api/feedback" style={{ marginTop: ".75rem", display: "grid", gap: ".5rem", maxWidth: 460 }}>
        <input type="hidden" name="repo" value={repo} />
        <select name="kind" style={{ padding: ".4rem", borderRadius: 6 }}>
          <option value="wrong-ai-mix">The human/AI mix is wrong</option>
          <option value="wrong-contributors">The contributors are wrong</option>
          <option value="not-mine">This isn&apos;t mine / shouldn&apos;t be here</option>
          <option value="other">Something else</option>
        </select>
        <input name="correction" required placeholder="What's actually true?" style={{ padding: ".5rem", borderRadius: 6, border: "1px solid #2a3340", background: "#0d1117", color: "inherit" }} />
        <button type="submit" style={{ padding: ".5rem 1rem", borderRadius: 6, cursor: "pointer", justifySelf: "start" }}>Submit correction</button>
      </form>
      <p style={{ fontSize: ".78rem", opacity: 0.55, marginTop: ".4rem" }}>
        Corrections become labeled data that improves the estimate — and the fastest path to claiming &amp; verifying your repo.
      </p>
    </details>
  );
}

function Form({ value }: { value?: string }) {
  return (
    <form method="get" style={{ display: "flex", gap: ".5rem", margin: "1.5rem 0 .5rem" }}>
      <input
        name="repo"
        defaultValue={value}
        placeholder="github.com/owner/repo"
        style={{ flex: 1, padding: ".6rem .75rem", fontSize: "1rem", borderRadius: 6, border: "1px solid #2a3340", background: "#0d1117", color: "inherit" }}
      />
      <button type="submit" style={{ padding: ".6rem 1.1rem", fontSize: "1rem", borderRadius: 6, cursor: "pointer" }}>
        Analyze
      </button>
    </form>
  );
}

export default async function AnalyzePage({ searchParams }: { searchParams: Promise<{ repo?: string; fb?: string }> }) {
  const { repo, fb } = await searchParams;

  if (!repo) {
    return (
      <main style={wrap}>
        <h1>Who made this?</h1>
        <p style={{ opacity: 0.7 }}>Paste a public repo. We name the contributors and score how verifiably its origin is disclosed — we never guess a human/AI ratio.</p>
        <Form />
        <p style={{ fontSize: ".8rem", opacity: 0.55 }}>
          Try{" "}
          {EXAMPLES.map((e, i) => (
            <span key={e}>
              {i > 0 ? " · " : ""}
              <a href={`/analyze?repo=${encodeURIComponent(e)}`}>{e}</a>
            </span>
          ))}
        </p>
      </main>
    );
  }

  const result = await analyzeRepo(repo);

  if (isAnalyzeError(result)) {
    return (
      <main style={wrap}>
        <h1>Who made this?</h1>
        <Form value={repo} />
        <p style={{ color: "#f0a0a0", marginTop: "1rem" }}>⚠ {result.error}</p>
      </main>
    );
  }

  const r = result;
  void track(FUNNEL.repoAnalyzed, { repo: r.repo }); // record the analyze event (fire-and-forget)
  // Tier-2 enrichment: overlay real name + reach onto the top handle'd contributors. Graceful — with
  // no GITHUB_TOKEN it's a no-op; on API failure it degrades to the un-enriched read (never throws).
  const cov = mirrorCoverage(r.aiInvolvedPercent, r.unattributedPercent);
  const [owner, name] = r.repo.split("/").slice(1, 3);
  // Public path: resolve @handles (a link-out to where the identity is disclosed) — we point, we do
  // NOT host a profile/reach card of a stranger (ARCH §1). The full profile is
  // relationship/consent-gated (repo owner / enterprise / claimed).
  const contributors = await resolveHandles(r.contributors, {
    token: process.env.GITHUB_TOKEN,
    repo: owner && name ? { owner, name } : undefined,
    top: 5,
  });
  const who = contributors.map((c) => `${c.name}${c.kind === "ai" ? " (AI)" : ""}`).join(" · ");

  return (
    <main style={wrap}>
      <h1 style={{ marginBottom: 0 }}>Who made this?</h1>
      {fb === "thanks" ? (
        <p style={{ color: "#9ad29a", margin: ".5rem 0 0", fontSize: ".9rem" }}>✓ Thanks — correction recorded.</p>
      ) : fb === "error" ? (
        <p style={{ color: "#f0a0a0", margin: ".5rem 0 0", fontSize: ".9rem" }}>⚠ Couldn&apos;t record that — tell us what&apos;s actually true.</p>
      ) : null}
      <p style={{ opacity: 0.6, marginTop: ".25rem", fontSize: ".85rem" }}>
        {r.repo} · {r.totalCommits} commits · {r.tier} tier (unverified)
      </p>

      {/* The bold one-line answer; everything else is opt-in below (progressive disclosure). */}
      <p style={{ fontSize: "1.4rem", margin: "1.25rem 0 0.25rem", lineHeight: 1.3 }}>Made by {who}</p>

      {/* Disclosure Score is the headline: we measure how verifiably the
          origin is DISCLOSED, never an AI ratio we can't compute. The blind spot is "undisclosed"
          — the correct answer — NEVER "human". Provable-AI is demoted to a labeled sub-fact. */}
      <div style={{ margin: "1rem 0 0", padding: "0.9rem 1rem", border: "1px solid #2a3340", borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.6 }}>
          Disclosure Score
        </p>
        <p style={{ margin: ".1rem 0 0", fontSize: "2rem", fontWeight: 700, lineHeight: 1.1 }}>
          {pct(r.disclosedPercent)}{" "}
          <span style={{ fontSize: "1rem", fontWeight: 400, opacity: 0.7 }}>of commits disclose their origin</span>
        </p>
        <p style={{ margin: ".4rem 0 0", fontSize: ".9rem", opacity: 0.85 }}>
          Disclosed via {pct(r.disclosedByTrailerPercent)} AI-authorship trailers ·{" "}
          {pct(r.disclosedBySignaturePercent)} signed commits
          {r.disclosedByDcoPercent > 0 ? ` · ${pct(r.disclosedByDcoPercent)} DCO sign-offs` : ""}.{" "}
          <strong style={{ color: "#e6b566" }}>{pct(r.undisclosedPercent)} undisclosed</strong> — origin
          neither declared nor verifiable. We don&apos;t guess whether that&apos;s human or AI.
        </p>
        <p style={{ margin: ".4rem 0 0", fontSize: ".82rem", opacity: 0.7 }}>
          Of what we can see, AI involvement is provable in {pct(cov.provableAiPercent)} of commits — a floor,
          not a ratio. We never report an AI percentage for the undisclosed part; no method does that
          reliably on real code (that&apos;s why we score disclosure, not authorship).
        </p>
        {/* Repo-level evidence (Branch B): committed AI-tool config proves tooling is in use even
            where per-commit trailers don't — the honest signal for the inline-AI user. Kept OUT of
            the per-commit score (category error); it sharpens the CTA instead. */}
        {r.tooling.tools.length > 0 ? (
          <p style={{ margin: ".4rem 0 0", fontSize: ".82rem", opacity: 0.75 }}>
            🛠 AI tooling in use: <strong>{r.tooling.tools.map((t) => t.name).join(", ")}</strong>{" "}
            (config committed to the repo)
            {r.disclosedByTrailerPercent < 50
              ? " — yet most commits don't disclose it. That gap is exactly what capturing closes."
              : "."}
          </p>
        ) : null}
        {/* Invitation to correct, pointed at the Disclosure Score. Symmetric —
            the AI-proud raise it by proving the AI's share; the human-proud raise it by signing +
            attesting their own work. Either way the action is "raise your score", never an accusation. */}
        <p style={{ margin: ".6rem 0 0", fontSize: ".95rem" }}>
          Think that undisclosed slice is too high? <strong>Raise your Disclosure Score</strong> — record
          the AI&apos;s share with{" "}
          <code style={{ background: "#11161f", padding: "0 .3rem", borderRadius: 4 }}>npx madeby ai</code>{" "}
          (it reads your own session logs locally — nothing leaves your machine), or affirm your own
          authorship with{" "}
          <code style={{ background: "#11161f", padding: "0 .3rem", borderRadius: 4 }}>npx madeby me</code>.
          Either way, you raise the score.
        </p>
      </div>

      {r.spanEvidence.attestations > 0 ? (
        <p style={{ fontSize: ".95rem", margin: ".4rem 0 0", color: "#9ad29a" }}>
          🔬 AI spans recorded in <strong>{r.spanEvidence.files}</strong> file
          {r.spanEvidence.files === 1 ? "" : "s"} ({r.spanEvidence.providers.map((p) => p.model).join(", ")})
          {r.spanEvidence.sources.includes("claude-code-session-log") ? " — witnessed by the tools' own session logs" : ""}. {}
          <span style={{ opacity: 0.7 }}>Self-reported (asserted tier) — unverified until commits are signed.</span>
        </p>
      ) : null}

      {/* Sworn carrier (ARCHITECTURE §3): we POINT to a self-hosted declaration, we don't host it.
          Tier is fail-safe — 'asserted' while the v1 template is a counsel-pending draft. */}
      {r.declaration.present ? (
        <p style={{ fontSize: ".95rem", margin: ".4rem 0 0", color: "#9ad29a" }}>
          📜 Self-hosted attestation found at <code>{r.declaration.path}</code>
          {r.declaration.signatory ? <> — signed by <strong>{r.declaration.signatory}</strong></> : ""}. {}
          <span style={{ opacity: 0.7 }}>Pointer only ({r.declaration.tier} tier — {r.declaration.note}); we detect it, we don&apos;t host it.</span>
        </p>
      ) : null}

      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem", opacity: 0.9, fontSize: ".9rem" }}>
        {contributors.map((c) => {
          // The mirror is GitHub-sourced today; a link-out exists only if the host has public
          // profile pages (github does, e.g. azure doesn't → shown as plain text). Point, don't host.
          const profileUrl = c.handle ? githubAdapter.profileUrl?.(c.handle) : undefined;
          return (
            <li key={`${c.kind}:${c.handle ?? c.name}`} style={{ padding: "0.12rem 0" }}>
              {c.kind === "ai" ? "🤖" : c.kind === "bot" ? "⚙️" : "🧑"} <strong>{c.name}</strong>
              {c.handle ? (
                profileUrl ? (
                  <a href={profileUrl} style={{ opacity: 0.75, marginLeft: ".35rem" }}>@{c.handle}</a>
                ) : (
                  <span style={{ opacity: 0.75, marginLeft: ".35rem" }}>@{c.handle}</span>
                )
              ) : null}
              <span style={{ opacity: 0.6 }}> — {c.commits} commit{c.commits === 1 ? "" : "s"}</span>
            </li>
          );
        })}
      </ul>

      <details style={{ marginTop: "1.5rem", fontSize: ".88rem", opacity: 0.85 }}>
        <summary style={{ cursor: "pointer", opacity: 0.7 }}>Show the evidence</summary>
        <p style={{ marginTop: ".75rem" }}>
          Commit-level estimate (asserted tier): 🧑 {pct(r.percent.human)} human-only · 🤝{" "}
          {pct(r.percent.with_ai)} human + AI · 🤖 {pct(r.percent.ai)} AI-authored · mean confidence{" "}
          {r.meanConfidence.toFixed(2)}.
        </p>
        <p style={{ fontSize: ".82rem", opacity: 0.7 }}>
          This is <strong>% of commits with AI involvement</strong>, not a line-by-line code ratio —
          a precise code split needs span-level evidence (a higher tier). {r.caveat}
        </p>
        <p style={{ fontSize: ".82rem", opacity: 0.7 }}>
          <strong>Provenance: 0% verified.</strong> Claim this repo to verify identities and sign
          commits → a higher tier. <em>(claim flow: producer-push, #6)</em>
        </p>
        {owner && name ? (
          <>
            <h3 style={{ fontSize: ".85rem", marginTop: "1.25rem", opacity: 0.7 }}>Badge</h3>
            <pre style={{ background: "#11161f", padding: "0.75rem", borderRadius: 6, overflowX: "auto", fontSize: ".78rem" }}>
              {badgeSnippet(owner, name)}
            </pre>
          </>
        ) : null}
      </details>

      <CorrectionForm repo={r.repo} />

      <p style={{ marginTop: "2rem" }}>
        <a href="/analyze">← analyze another repo</a>
      </p>
    </main>
  );
}
