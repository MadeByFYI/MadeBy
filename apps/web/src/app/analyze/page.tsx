import { readGitLog, analyzeCommits, badgeSnippet } from "@madeby/analyzer";

// Reads git at request time → never prerendered.
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n)}%`;

export default function AnalyzePage() {
  const commits = readGitLog(process.cwd());

  if (commits.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h1>Who made this?</h1>
        <p style={{ opacity: 0.7 }}>
          Analysis unavailable here (no git history in this environment). In v0 the mirror runs
          on a repo on disk; arbitrary public-repo analysis arrives with ingestion (#10).
        </p>
      </main>
    );
  }

  const r = analyzeCommits(commits);
  const snippet = badgeSnippet("MacDougherty", "MadeBy");
  const who = r.contributors
    .map((c) => `${c.name}${c.kind === "ai" ? " (AI)" : ""}`)
    .join(" · ");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ marginBottom: 0 }}>Who made this?</h1>
      <p style={{ opacity: 0.6, marginTop: ".25rem", fontSize: ".85rem" }}>
        {r.totalCommits} commits · {r.tier} tier (unverified)
      </p>

      {/* The answer: named contributors. */}
      <p style={{ fontSize: "1.3rem", margin: "1.25rem 0 0.25rem" }}>Made by {who}</p>

      <ul style={{ listStyle: "none", padding: 0, opacity: 0.85, fontSize: ".9rem" }}>
        {r.contributors.map((c) => (
          <li key={`${c.kind}:${c.name}`} style={{ padding: "0.1rem 0" }}>
            {c.kind === "ai" ? "🤖" : "🧑"} <strong>{c.name}</strong>
            {c.detail ? <span style={{ opacity: 0.6 }}> · {c.detail}</span> : null}
            <span style={{ opacity: 0.6 }}> — {c.commits} commit{c.commits === 1 ? "" : "s"}</span>
          </li>
        ))}
      </ul>

      {/* Facet: the human/AI split. */}
      <p style={{ marginTop: "1.5rem", fontSize: ".9rem", opacity: 0.75 }}>
        AI-involved on {pct(r.aiInvolvedPercent)} of commits · 🧑 {pct(r.percent.human)} · 🤖+
        {pct(r.percent.with_ai)} with AI · 🤖 {pct(r.percent.ai)} AI · mean confidence{" "}
        {r.meanConfidence.toFixed(2)}
      </p>

      <h2 style={{ fontSize: ".9rem", marginTop: "2.5rem", opacity: 0.7 }}>Badge</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- live-served external SVG */}
      <img src="/api/badge" alt="madeby.fyi badge" style={{ display: "block", marginBottom: "0.75rem" }} />
      <pre
        style={{ background: "#11161f", padding: "0.75rem", borderRadius: 6, overflowX: "auto", fontSize: ".8rem" }}
      >
        {snippet}
      </pre>

      <p style={{ fontSize: ".8rem", opacity: 0.55, marginTop: "2rem" }}>{r.caveat} Claim this repo
        to verify identities and sign commits → a higher tier. <em>(claim flow: producer-push, #6)</em>
      </p>
    </main>
  );
}
