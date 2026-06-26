import type { ReactNode } from "react";
import { demoRegistry, resolveByFingerprint } from "@madeby/registry";

export const dynamic = "force-dynamic";

// The authoritative resolver page a badge links to: "who made this content?"
export default async function ResolverPage({
  params,
}: {
  params: Promise<{ algorithm: string; value: string }>;
}) {
  const { algorithm, value } = await params;
  const alg = decodeURIComponent(algorithm);
  const val = decodeURIComponent(value);
  const resolution = resolveByFingerprint(demoRegistry(), alg, val);

  const wrap = (children: ReactNode) => (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>{children}</main>
  );

  if (!resolution || !resolution.best) {
    return wrap(
      <>
        <h1>Who made this?</h1>
        <p style={{ opacity: 0.7 }}>
          No record for <code>{alg}:{val}</code> yet.{" "}
          <a href="/analyze" style={{ color: "#7ee0c0" }}>
            Analyze it →
          </a>
        </p>
      </>,
    );
  }

  const best = resolution.best;
  const a = best.claim.attribution;
  const who = `${a.identityId}${a.aiProvider ? ` with ${a.aiProvider}${a.aiModel ? `/${a.aiModel}` : ""} (AI)` : ""}`;

  return wrap(
    <>
      <h1 style={{ marginBottom: 0 }}>Who made this?</h1>
      <p style={{ opacity: 0.6, marginTop: ".25rem", fontSize: ".8rem" }}>
        subject <code>{resolution.subject.algorithm}:{resolution.subject.value.slice(0, 16)}…</code>
      </p>

      <p style={{ fontSize: "1.4rem", margin: "1.25rem 0 0.25rem" }}>Made by {who}</p>
      <p style={{ fontSize: ".9rem", opacity: 0.8 }}>
        tier: <strong>{best.tier}</strong> · {resolution.claims.length} claim
        {resolution.claims.length === 1 ? "" : "s"}, ordered by evidence (not adjudicated)
      </p>

      <p style={{ fontSize: ".8rem", opacity: 0.55, marginTop: "2rem" }}>
        This is the authoritative page a badge links to. Asserted/unverified until the subject is
        claimed and its commits signed (verification path, #18). Registry is a v0 placeholder
        until ingestion (#10).
      </p>
    </>,
  );
}
