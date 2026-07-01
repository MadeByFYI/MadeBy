import { analyzeRepo, badgeSnippet, isAnalyzeError } from "@madeby/analyzer";
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
        <p style={{ opacity: 0.7 }}>Paste a public repo and see who made it — humans and AI, named.</p>
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
  void track(FUNNEL.repoAnalyzed, { repo: r.repo }); // top of the asserted→verified funnel (fire-and-forget)
  const who = r.contributors.map((c) => `${c.name}${c.kind === "ai" ? " (AI)" : ""}`).join(" · ");
  const cov = mirrorCoverage(r.aiInvolvedPercent, r.unattributedPercent);
  const [owner, name] = r.repo.split("/").slice(1, 3);

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

      {/* Coverage-led, never a confident 'human' ratio: lead with what we can PROVE, and split the
          rest honestly — named humans are attributed (AI unknown), not "we can't see it" (#79/#87). */}
      <div style={{ margin: "1rem 0 0", padding: "0.9rem 1rem", border: "1px solid #2a3340", borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: ".95rem", opacity: 0.85 }}>
          AI involvement <strong>provable in {pct(cov.provableAiPercent)}</strong> of commits.
        </p>
        <p style={{ margin: ".25rem 0 0", fontSize: "1.25rem", color: "#e6b566" }}>
          <strong>{pct(cov.humanAttributedPercent)} human-attributed</strong> — a person committed these; whether AI helped is undisclosed.
        </p>
        {cov.fullyUnattributedPercent > 0 ? (
          <p style={{ margin: ".2rem 0 0", fontSize: ".9rem", opacity: 0.75 }}>
            {pct(cov.fullyUnattributedPercent)} unattributed — no author on record.
          </p>
        ) : null}
        {cov.weakHumanSignal ? (
          <p style={{ margin: ".4rem 0 0", fontSize: ".82rem", opacity: 0.7 }}>
            For recent repos, &quot;no AI signal&quot; often means <em>undisclosed</em> AI, not no AI. We only
            count AI we can see.
          </p>
        ) : null}
        {/* Provocation-to-correct (STRATEGY §5): dare the owner to close the gap. Always the
            under-claim ("reads human/unverified"), never an AI accusation — honest + libel-safe. */}
        <p style={{ margin: ".6rem 0 0", fontSize: ".95rem" }}>
          Think we&apos;re underselling your AI game? By what we can see, the rest reads human.{" "}
          <strong>Prove us wrong: <code style={{ background: "#11161f", padding: "0 .3rem", borderRadius: 4 }}>npx madeby prove</code></strong>{" "}
          reads your own session logs (locally — nothing leaves your machine) and shows what the AI actually wrote.
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

      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem", opacity: 0.9, fontSize: ".9rem" }}>
        {r.contributors.map((c) => (
          <li key={`${c.kind}:${c.name}`} style={{ padding: "0.12rem 0" }}>
            {c.kind === "ai" ? "🤖" : "🧑"} <strong>{c.name}</strong>
            {c.detail ? <span style={{ opacity: 0.6 }}> · {c.detail}</span> : null}
            <span style={{ opacity: 0.6 }}> — {c.commits} commit{c.commits === 1 ? "" : "s"}</span>
          </li>
        ))}
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
