"use client";

import { useEffect } from "react";

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
}

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = ([] as Element[]).slice.call(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) {
        e.classList.add("in");
      });
      return;
    }
    const io = new IntersectionObserver(
      function (en) {
        en.forEach(function (x) {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            io.unobserve(x.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach(function (e) {
      io.observe(e);
    });
  }, []);

  return (
    <>
      <header>
        <div className="wrap bar">
          <span className="brand">
            <span className="seal"></span>madeby
          </span>
          <nav>
            <a className="nlink" href="#how">
              How it works
            </a>
            <a className="nlink" href="#build">
              Build on it
            </a>
            <a className="nlink" href="#registry">
              Registry
            </a>
            <a className="nlink" href="#scope">
              What it isn&apos;t
            </a>
            <button
              className="toggle"
              id="tg"
              aria-label="Toggle color theme"
              title="Toggle theme"
              onClick={toggleTheme}
            >
              ◐
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero wrap reveal">
          <span className="eyebrow">Content provenance · starting with code</span>
          <h1>
            Who made this?
            <br />
            <span style={{ color: "var(--accent-ink)" }}>Your code answers.</span>
          </h1>
          <p className="lead">
            AI writes a growing share of the code in your pull requests — and nothing tells you which. MadeBy makes origin — human or AI — part of the record on every pull request, then turns that record into a provenance layer you and your agents build on.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="https://github.com/MadeByFYI/MadeBy">
              Get started &nbsp;→
            </a>
            <a className="btn btn-ghost" href="#how">
              See how it works
            </a>
          </div>
          <p className="trust">Two files · your source never leaves your CI · you set the policy</p>

          <div
            className="term"
            role="img"
            aria-label="Terminal: madeby check fails on an undisclosed commit under a required policy, then passes after the contributor discloses it."
          >
            <div className="term-top">
              <span className="dots">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className="term-title">~/project — .madeby/policy.json: required</span>
            </div>
            <div className="term-body">
              <pre>
                <span className="prompt">$</span>
                {" madeby check\nmadeby check — 1/2 commits disclose origin. 1 undisclosed.\n\n  "}
                <span className="cross">✗</span>
                {"  cdf9baca  feat: add subtract helper\n\n  "}
                <span className="dim">To disclose: add a Co-Authored-By / Signed-off-by trailer,</span>
                {"\n  "}
                <span className="dim">affirm with  madeby me,  or record the AI with  madeby ai.</span>
                {"\n\nexit 1"}
                <span className="after">
                  <span className="prompt">$</span>
                  {" git commit --amend --trailer "}
                  <span className="ok">&quot;Signed-off-by: Dev &lt;dev@acme.dev&gt;&quot;</span>
                  {"\n"}
                  <span className="prompt">$</span>
                  {" madeby check\nmadeby check — "}
                  <span className="ok">2/2 commits disclose origin.</span>
                  {"\n\nexit 0   "}
                  <span className="tick">✓</span>
                  {" the gate passes"}
                </span>
              </pre>
            </div>
          </div>
        </section>

        <section className="statement wrap reveal">
          <div className="kicker">
            <span className="eyebrow">The record</span>
            <span className="rule"></span>
          </div>
          <h2>
            A codebase that remembers <span className="accentword">where it came from</span>.
          </h2>
          <p className="lead">
            A disclosure doesn&apos;t just clear the check and vanish — it stays in the history. Your repository becomes a record you can query: which parts were AI-assisted, who to ask about a module, exactly what a security or license review needs to see. The gate is how disclosures get in; the payoff is a codebase whose origins stay on the record for as long as the code lives.
          </p>
          <p className="eyebrow" style={{ color: "var(--accent-ink)", marginTop: "34px" }}>
            For the agents, too
          </p>
          <p className="lead" style={{ marginTop: "12px" }}>
            When an AI returns to code it — or another model — wrote, the MadeBy signature tells it what it&apos;s touching: human decisions made on purpose, or AI-scaffolded work and the tool and model behind it. Provenance becomes machine-readable memory — so the next agent builds from the record instead of guessing. Transparency isn&apos;t anti-AI; it&apos;s what lets people and agents build on each other&apos;s work with confidence.
          </p>
        </section>

        <section className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">What becomes possible</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Small primitives. Big new moves.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            Each is a plain, honest signal — but together they turn work that used to be manual, contentious, or flat-out impossible into a single line you run.
          </p>
          <div className="caps">
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Set the rule, once.</h3>
                <p>&quot;No undisclosed AI in this project&quot; stops being a norm you argue in every thread and becomes a required check that just runs on every PR.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Triage the flood.</h3>
                <p>Every pull request shows what discloses its origin and what doesn&apos;t — review the accountable ones first; low-effort drive-bys get deterred at the door.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Make complying trivial.</h3>
                <p>A trailer, a sign-off, <span className="m">madeby me</span>, or <span className="m">madeby ai</span> — and the check tells the contributor exactly how. No new account, no new workflow.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Track coverage like tests.</h3>
                <p>Your disclosure coverage becomes a number you can watch and report — provenance coverage, for the team standup or a security review.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Answer &quot;who made this?&quot;</h3>
                <p>One read — <span className="m">madeby who</span>, a file or the whole repo — for review routing, credit, and the questions that used to mean an afternoon of git archaeology.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">How it works</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Two committed files. Nothing installed, nothing hosted.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            Start in <b>advisory</b> — it reports coverage and never fails a build. Switch to <b>required</b> when you&apos;re ready to enforce. Or let an agent set it up: <span className="mono" style={{ color: "var(--ink)" }}>npx madeby init</span>.
          </p>

          <div className="files">
            <div className="file">
              <div className="fname">.madeby/policy.json</div>
              <pre>
                {"{"}
                {"\n  "}
                <span className="k">&quot;version&quot;</span>
                {": "}
                <span className="s">0</span>
                {",\n  "}
                <span className="k">&quot;mode&quot;</span>
                {": "}
                <span className="s">&quot;advisory&quot;</span>
                {"\n}"}
              </pre>
            </div>
            <div className="file">
              <div className="fname">.github/workflows/disclosure.yml</div>
              <pre>
                <span className="k">on</span>
                {": pull_request\n"}
                <span className="k">jobs</span>
                {":\n  madeby:\n    "}
                <span className="k">runs-on</span>
                {": ubuntu-latest\n    "}
                <span className="k">steps</span>
                {":\n      - "}
                <span className="k">uses</span>
                {": actions/checkout@v4\n        "}
                <span className="k">with</span>
                {": { fetch-depth: "}
                <span className="s">0</span>
                {" }\n      - "}
                <span className="k">uses</span>
                {": MadeByFYI/MadeBy/packages/action@v0.2.0"}
              </pre>
            </div>
          </div>

          <p className="eyebrow" style={{ marginTop: "34px" }}>
            What counts as disclosed
          </p>
          <div className="chips">
            <span className="chip">
              <span className="d"></span>Co-Authored-By / Generated-by trailer
            </span>
            <span className="chip">
              <span className="d"></span>Authored-by-human affirmation
            </span>
            <span className="chip">
              <span className="d"></span>DCO Signed-off-by
            </span>
            <span className="chip">
              <span className="d"></span>Commit signature
            </span>
            <span className="chip">
              <span className="d"></span>madeby ai / me attestation
            </span>
            <span className="chip">
              <span className="d"></span>Bots recognized automatically
            </span>
          </div>
          <p className="lead" style={{ marginTop: "20px", fontSize: "15.5px", maxWidth: "66ch" }}>
            Disclosure runs <strong>both ways</strong>: affirm human authorship, or disclose the AI — both ride the same ladder, and MadeBy records what&apos;s claimed rather than guessing. If you wrote it yourself, one trailer says so.
          </p>
        </section>

        <section className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">The trust model</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>An honest ladder, not a single bit.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            Every claim carries the tier its evidence supports — and no higher. Human and AI disclosure climb the <em>same</em> rungs: a trailer is <b>asserted</b>; a signature verifies <em>who</em> claimed it; a sworn declaration is <b>sworn</b>. The system <b>fails safe</b> — past a positive signal it degrades to <em>unknown</em>, never to falsely-verified, and never to a guess.
          </p>
          <div className="ladder">
            <div className="rung">
              <div className="lvl">Tier 1</div>
              <div className="name">Asserted</div>
              <div className="desc">Stated on the record. Unverified.</div>
              <div className="meter"></div>
            </div>
            <div className="rung">
              <div className="lvl">Tier 2</div>
              <div className="name">Sworn</div>
              <div className="desc">A signed legal declaration of authorship.</div>
              <div className="meter"></div>
            </div>
            <div className="rung">
              <div className="lvl">Tier 3</div>
              <div className="name">Verified</div>
              <div className="desc">A checkable cryptographic signature.</div>
              <div className="meter"></div>
            </div>
            <div className="rung">
              <div className="lvl">Tier 4</div>
              <div className="name">Bound</div>
              <div className="desc">Cryptographically bound to the exact bytes.</div>
              <div className="meter"></div>
            </div>
          </div>
        </section>

        <section id="build" className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">Build on it</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>A provenance layer, not a checkbox.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            The gate is the front door. Behind it is a <b>queryable provenance record</b> and <b>composable primitives</b> — as a library, a CLI (<span className="mono" style={{ color: "var(--ink)" }}>--json</span>), and an MCP server — so you, and your agents, build your own gates, views, and provenance-aware tooling on top. Primitives you run, on an open protocol.
          </p>
          <div className="grid g2" style={{ alignItems: "start", gap: "40px", marginTop: "30px" }}>
            <div className="caps" style={{ gridTemplateColumns: "1fr", gap: "24px", marginTop: "0" }}>
              <div className="cap">
                <span className="capmark"></span>
                <div>
                  <h3>Query the record.</h3>
                  <p><span className="m">madeby who</span> reads what&apos;s disclosed about a file — or the whole repo — across every attestation it recognizes. Build review bots, &quot;who-wrote-this&quot; navigation, or a supply-chain gate on the answer.</p>
                </div>
              </div>
              <div className="cap">
                <span className="capmark"></span>
                <div>
                  <h3>Compose the primitives.</h3>
                  <p><span className="m">check</span> · <span className="m">who</span> · <span className="m">ai</span> — as a library, a CLI with structured output, or MCP tools. Your own policy, your own coverage view, your own workflow.</p>
                </div>
              </div>
              <div className="cap">
                <span className="capmark"></span>
                <div>
                  <h3>Agents, no human in the loop.</h3>
                  <p><span className="m">madeby mcp</span> exposes it as self-teaching tools — an agent reads the provenance record for context, aligns the repo, records its own work, and checks the gate.</p>
                </div>
              </div>
            </div>
            <div className="term">
              <div className="term-top">
                <span className="dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span className="term-title">agent · orient before refactoring</span>
              </div>
              <div className="term-body">
                <pre>
                  <span className="prompt">→</span>
                  {" madeby who         "}
                  <span className="ok">AI surface mapped</span>
                  {"\n"}
                  <span className="prompt">→</span>
                  {" who src/auth.ts    human-authored "}
                  <span className="dim">(attested)</span>
                  {"\n"}
                  <span className="prompt">→</span>
                  {" who src/pay.ts     ai · claude-opus-4-8\n"}
                  <span className="prompt">→</span>
                  {" edit, then  ai     "}
                  <span className="ok">recorded its own span</span>
                  {"\n"}
                  <span className="prompt">→</span>
                  {" check              "}
                  <span className="tick">✓</span>
                  {" the gate passes\n\n"}
                  <span className="dim">provenance is context — no human in the loop.</span>
                </pre>
              </div>
            </div>
          </div>
          <p className="eyebrow" style={{ marginTop: "32px" }}>
            The MCP tools
          </p>
          <div className="tools">
            <span className="tool">
              <b>init</b>
            </span>
            <span className="tool">
              <b>check</b>
            </span>
            <span className="tool">
              <b>who</b>
            </span>
            <span className="tool">
              <b>ai</b>
            </span>
          </div>
          <p style={{ marginTop: "12px", color: "var(--faint)", fontSize: "13px", lineHeight: "1.55" }}>
            Four tools, no more. (<span className="mono">me</span> — affirming <em>human</em> authorship — is a CLI command, not an agent tool: an agent is AI, so it discloses with <span className="mono">ai</span>.)
          </p>
        </section>

        <section id="registry" className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">The registry</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Record it once. Resolve it anywhere.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            Keep provenance local, or record your attestations with MadeBy — and only the <em>derived</em> record leaves, never your source. In the registry, provenance stops being a file in one repo and becomes something anyone can resolve by the content&apos;s own hash. Every bit of this lands <strong>solo, from your first commit</strong> — no network required.
          </p>
          <div className="caps">
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Resolvable by hash.</h3>
                <p>Someone holding your package — or a single file — can look up its origin without your repo. Provenance survives being vendored, re-published, or stripped, because it&apos;s keyed on the content, not the file.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Verifiable, not just stated.</h3>
                <p>Attestations are timestamped and tamper-evident: the record shows <em>this claim existed at time T</em> — non-repudiation that doesn&apos;t depend on any one host, or on us.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>A record you own.</h3>
                <p>A verifiable authorship history that&apos;s yours to keep and show — checkable, not a résumé taken on faith. Your provenance, backed beyond your repo and your CI.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>On your terms.</h3>
                <p>Push only what you choose — aggregate, blinded, or full. The source never leaves; the protocol is open; the record is portable. Producing provenance is free — the shared, resolvable record is where MadeBy earns its keep.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">The upside, as the graph grows</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>And it compounds across the ecosystem.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            Everything above lands solo. This is the payoff that grows — never a prerequisite: as more of the ecosystem records with MadeBy, the same record you kept from day one starts to reach beyond your own codebase.
          </p>
          <div className="caps">
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Gate your supply chain.</h3>
                <p>Resolve the provenance of the code you depend on, not just what you wrote — &quot;how much of this dependency is undisclosed AI?&quot; becomes a policy you can enforce transitively.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>See where your code went.</h3>
                <p>Attestations connect across repos: an author sees their code&apos;s reach, a project sees whose work it&apos;s built on. Fair credit and influence, computed from a signed graph — not guessed from <span className="m">git blame</span>.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Reputation that travels.</h3>
                <p>An author carries a checkable authorship record across employers — a portfolio others verify, not a résumé taken on faith. Build hiring, credentials, or contribution-weighted splits on it.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Agents that reason across it.</h3>
                <p>An agent resolves a library&apos;s provenance before it pulls it in — &quot;mostly undisclosed AI, flag it&quot; — reasoning over the whole dependency graph, not just the repo in front of it.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">Any host</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Git-native, host-adapted.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            The gate runs anywhere git does. GitHub, Azure DevOps, and GitLab are turnkey — the CI environment auto-scopes the check to the pull request&apos;s own commits. Any other CI is one line: <span className="mono" style={{ color: "var(--ink)" }}>npx madeby check &lt;range&gt;</span>.
          </p>
          <div className="hosts">
            <span className="host">
              <span className="s"></span>GitHub Actions
            </span>
            <span className="host">
              <span className="s"></span>Azure DevOps
            </span>
            <span className="host">
              <span className="s"></span>GitLab CI
            </span>
            <span className="host soft">
              <span className="s"></span>Any git host — one line
            </span>
          </div>
        </section>

        <section className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">Convention over configuration</span>
            <span className="rule"></span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Lean into the convention. Everyone goes faster.</h2>
          <p className="lead" style={{ marginTop: "16px" }}>
            You could design and maintain your own disclosure check — one repo, one format, forever yours to keep working. Leaning into the convention is the faster path: nothing to decide or wire up, and — because it&apos;s built on signals developers already produce — nothing new for you or your contributors to learn. It&apos;s open and runs in your own CI, so leaning in costs you no lock-in.
          </p>
          <div className="caps">
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Nothing to configure.</h3>
                <p>The signals, the policy shape, the sensible defaults are already set. <span className="m">npx madeby init</span> and you&apos;re enforcing — no format to invent, no edge cases to chase, no treadmill to maintain.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>No learning curve.</h3>
                <p>The convention recognizes what contributors already do — <span className="m">Co-Authored-By</span> trailers, DCO sign-offs, signed commits. Your team keeps working the way it works; the check just reads it. A bespoke regex is a new dialect everyone has to learn first.</p>
              </div>
            </div>
            <div className="cap">
              <span className="capmark"></span>
              <div>
                <h3>Inherit the hard parts.</h3>
                <p>A dozen tools&apos; recognizers — and the discipline you&apos;d get wrong alone: disclosure not detection, fail-safe to unknown, never over-claim. Baked in and maintained centrally, yours to inherit rather than build.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="scope" className="wrap reveal">
          <div className="kicker">
            <span className="eyebrow">What it is — and isn&apos;t</span>
            <span className="rule"></span>
          </div>
          <div className="grid g2" style={{ gap: "20px" }}>
            <div className="card">
              <h3 style={{ color: "var(--pass)" }}>What MadeBy is</h3>
              <p>Disclosure and accountability. A neutral instrument that recognizes origin signals and enforces the policy <em>you</em> set. A <b>required</b> gate deters low-effort drive-bys and gives you a basis to triage.</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--warn)" }}>What it isn&apos;t</h3>
              <p>Not an AI slop-blocker, and not a detector. It does not — and will never — claim to guess whether code is AI. No shame pages, no per-person scores. Honesty is the product.</p>
            </div>
          </div>
        </section>

        <section className="wrap reveal">
          <div className="proof">
            <div>
              <div className="stat">Who made MadeBy?</div>
              <div className="lbl">Our own answer, measured by the tool itself — from the first commit.</div>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <span className="badge">
                  <span className="badge-row">
                    <span className="badge-l">
                      <span className="seal"></span>madeby
                    </span>
                    <span className="badge-r t-asserted">hi&nbsp;+&nbsp;ai</span>
                  </span>
                  <span className="badge-cov">
                    <span className="cov-label">known</span>
                    <span className="cov-meter">
                      <i style={{ width: "97%" }}></i>
                    </span>
                    <span className="cov-pct">97%</span>
                  </span>
                </span>
                <span style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: "1.55", maxWidth: "40ch" }}>
                  100 of our 103 commits disclose their origin. The other three we can&apos;t yet vouch for — so we mark them <b style={{ color: "var(--ink)" }}>unknown</b>, never &quot;human.&quot; Honesty is the product.
                </span>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <p className="lead" style={{ fontSize: "17px", marginBottom: "16px", maxWidth: "30ch" }}>
                Two files. Nothing hosted. Start advisory, enforce when ready.
              </p>
              <a className="btn btn-primary" href="https://github.com/MadeByFYI/MadeBy">
                Get started on GitHub &nbsp;→
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap">
        <div className="foot-row">
          <span className="brand" style={{ fontSize: "15px" }}>
            <span className="seal"></span>madeby
          </span>
          <span>Disclosure, never detection · content provenance, starting with code · MIT</span>
        </div>
      </footer>
    </>
  );
}
