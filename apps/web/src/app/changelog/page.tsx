// Public changelog: shows that feedback visibly produces change. Hand-curated for now; entries are
// added as user-facing changes ship.
export const dynamic = "force-static";

const wrap = { maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" } as const;

const ENTRIES: { date: string; items: string[] }[] = [
  {
    date: "2026-06",
    items: [
      "Analyze any public repo on the spot — named contributors, humans and AI.",
      "Witnessed AI spans: when a repo records its tools' session logs, we count the AI work commit trailers miss.",
      "“Wrong? Tell us who really made it” — corrections now feed the estimate's accuracy.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main style={wrap}>
      <h1>What&apos;s changed</h1>
      <p style={{ opacity: 0.7 }}>
        We publish what we ship — including the changes your corrections drive. Provenance for a
        provenance company.
      </p>
      {ENTRIES.map((e) => (
        <section key={e.date} style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", opacity: 0.7 }}>{e.date}</h2>
          <ul style={{ lineHeight: 1.6 }}>
            {e.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
