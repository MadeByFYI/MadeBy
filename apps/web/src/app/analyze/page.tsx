import { analyzeRepo, badgeSnippet, isAnalyzeError } from "@madeby/analyzer";

// Clones + analyzes at request time → Node runtime, never prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n)}%`;
const wrap = { maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" } as const;

const EXAMPLES = ["github.com/octocat/Hello-World", "github.com/sindresorhus/slugify"];

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

export default async function AnalyzePage({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { repo } = await searchParams;

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
  const who = r.contributors.map((c) => `${c.name}${c.kind === "ai" ? " (AI)" : ""}`).join(" · ");
  const [owner, name] = r.repo.split("/").slice(1, 3);

  return (
    <main style={wrap}>
      <h1 style={{ marginBottom: 0 }}>Who made this?</h1>
      <p style={{ opacity: 0.6, marginTop: ".25rem", fontSize: ".85rem" }}>
        {r.repo} · {r.totalCommits} commits · {r.tier} tier (unverified)
      </p>

      {/* The bold one-line answer; everything else is opt-in below (progressive disclosure). */}
      <p style={{ fontSize: "1.4rem", margin: "1.25rem 0 0.25rem", lineHeight: 1.3 }}>Made by {who}</p>
      <p style={{ fontSize: ".95rem", opacity: 0.8, margin: 0 }}>
        AI-involved on <strong>{pct(r.aiInvolvedPercent)}</strong> of commits.
      </p>

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

      <p style={{ marginTop: "2rem" }}>
        <a href="/analyze">← analyze another repo</a>
      </p>
    </main>
  );
}
