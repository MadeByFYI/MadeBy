import { TRUST_TIERS } from "@madeby/core";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>madeby.fyi</h1>
      <p style={{ opacity: 0.8 }}>Who made this thing? — verifiable provenance, starting with code.</p>

      <h2 style={{ fontSize: "1rem", marginTop: "2.5rem", opacity: 0.7 }}>Trust tiers</h2>
      <ol>
        {TRUST_TIERS.map((tier) => (
          <li key={tier} style={{ padding: "0.15rem 0" }}>
            <code>{tier}</code>
          </li>
        ))}
      </ol>

      <p style={{ marginTop: "2.5rem" }}>
        <a href="/analyze" style={{ color: "#7ee0c0" }}>
          Analyze this repo → who made it?
        </a>
      </p>
      <p style={{ marginTop: "0.5rem" }}>
        <a
          href="/r/git-blob-sha1/ce013625030ba8dba906f756967f9e9ca394464a"
          style={{ color: "#7ee0c0" }}
        >
          Resolve content by hash → who made this?
        </a>
      </p>

      <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.5 }}>
        Skeleton — see STRATEGY / ARCHITECTURE / OPERATIONS / TESTING.
      </p>
    </main>
  );
}
