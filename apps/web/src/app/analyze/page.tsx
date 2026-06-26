import { readGitLog, analyzeCommits, badgeSnippet } from "@madeby/analyzer";

// Reads git at request time → never prerendered.
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n)}%`;

export default function AnalyzePage() {
  const commits = readGitLog(process.cwd());

  if (commits.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1>Analyze</h1>
        <p style={{ opacity: 0.7 }}>
          Analysis unavailable here (no git history in this environment). In v0 the mirror runs
          on a repo on disk; arbitrary public-repo analysis arrives with ingestion (#10).
        </p>
      </main>
    );
  }

  const r = analyzeCommits(commits);
  const snippet = badgeSnippet("MacDougherty", "MadeBy");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ marginBottom: 0 }}>madeby.fyi · this repo</h1>
      <p style={{ opacity: 0.6, marginTop: ".25rem", fontSize: ".85rem" }}>
        Estimate over {r.totalCommits} commits · {r.classification.methodology} · mean confidence{" "}
        {r.meanConfidence.toFixed(2)}
      </p>

      <div style={{ fontSize: "1.6rem", margin: "1.5rem 0" }}>
        🧑 {pct(r.percent.human)} &nbsp;·&nbsp; 🤖 {pct(r.aiInvolvedPercent)} <span style={{ opacity: 0.5, fontSize: "1rem" }}>AI-involved</span>
      </div>

      <table style={{ fontSize: ".9rem", opacity: 0.85, borderSpacing: "0 .25rem" }}>
        <tbody>
          <tr><td style={{ paddingRight: "1.5rem" }}>human</td><td>{pct(r.percent.human)}</td></tr>
          <tr><td>with AI</td><td>{pct(r.percent.with_ai)}</td></tr>
          <tr><td>AI</td><td>{pct(r.percent.ai)}</td></tr>
        </tbody>
      </table>

      {r.topProviders.length > 0 && (
        <p style={{ fontSize: ".85rem", opacity: 0.7 }}>
          AI providers: {r.topProviders.map((p) => `${p.provider} (${p.count})`).join(" · ")}
        </p>
      )}

      <h2 style={{ fontSize: ".9rem", marginTop: "2.5rem", opacity: 0.7 }}>Copy badge</h2>
      <pre
        style={{
          background: "#11161f",
          padding: "0.75rem",
          borderRadius: 6,
          overflowX: "auto",
          fontSize: ".8rem",
        }}
      >
        {snippet}
      </pre>

      <p style={{ fontSize: ".85rem", opacity: 0.6, marginTop: "2rem" }}>
        This is an estimate from commit metadata, not a verified claim. Claim this repo to verify
        your identity and sign commits → a higher trust tier. <em>(claim flow: producer-push, #6)</em>
      </p>
    </main>
  );
}
