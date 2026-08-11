# Publishing the `madeby` CLI to npm

This is the one blocker on the whole maintainer-outreach path (`GTM/maintainer-outreach.md`): the
GitHub Action and the quickstart both run `npx madeby check`, so they're inert until the package is
live. Everything below is verified — the CLI builds, runs end-to-end, and the tarball is clean.

## State (verified 2026-08-11)

- **Name `madeby` is available on npm** (unscoped). Claiming it is first-come — publish to hold it.
- The package builds to a single self-contained bundle (`dist/madeby.mjs`, ~42 kB, zero runtime
  deps — `@madeby/*` are bundled in at build time, kept as `devDependencies`).
- `npm pack --dry-run` ships exactly **3 files**: `README.md`, `dist/madeby.mjs`, `package.json`.
- The disclosure gate is covered end-to-end by `packages/cli/src/check.integration.test.ts` (spawns
  the built bin against throwaway repos: advisory / required / off / range / malformed / non-repo →
  asserts exit codes). It runs in CI's trust-gate job.

## Publish (use `pnpm publish`)

Publish with **pnpm**, not `npm publish` — pnpm rewrites the `workspace:*` protocol correctly and
runs the `prepublishOnly` build for you.

```sh
# 1. one-time: authenticate to npm as the account that will own `madeby`
npm login                      # or: npm adduser

# 2. from the package dir
cd packages/cli

# 3. sanity re-check what will ship (should be README.md + dist/madeby.mjs + package.json)
npm pack --dry-run

# 4. publish (pnpm runs `prepublishOnly` → fresh build first)
pnpm publish --access public --no-git-checks
#   --access public : required for the first publish of any package
#   --no-git-checks : pnpm otherwise refuses to publish from a non-clean / non-main branch
```

## Verify it's live

```sh
npm view madeby version                 # → 0.1.0
cd "$(mktemp -d)" && git init -q        # a throwaway repo
npx madeby@latest check                 # should print a disclosure summary, exit 0 (no policy → off)
```

## Immediately after

1. **Tell the outreach doc it's unblocked** — the "publish first" warning in
   `GTM/maintainer-outreach.md` is now satisfied; the note can go out.
2. **Pin the Action to a tag.** `packages/action` currently points at
   `MacDougherty/MadeBy/packages/action@main`. Cut a git tag (e.g. `v0.1.0`) and update the
   quickstart to reference it, so a maintainer's CI isn't tracking a moving `main`.
3. **Version bumps from here:** edit `packages/cli/package.json` `version`, re-run
   `pnpm --filter madeby test`, then `pnpm publish` again. Follow semver — the exit-code contract in
   the README is the public API.

## If the name is ever taken

Fall back to the scope: rename the package to `@madeby/cli` (the `@madeby` scope is also free as of
2026-08-11). Then invocations become `npx @madeby/cli check`; update the Action wrapper and both
READMEs accordingly.
