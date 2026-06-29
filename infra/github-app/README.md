# MadeBy GitHub App

The MadeBy GitHub App does two jobs (`OPERATIONS.md` §4):

1. **OAuth login** — GitHub-primary sign-in via Auth.js/NextAuth (the code-first wedge).
2. **On-demand repo reads** — read the content + git history of repos a user engages with, to
   fingerprint and attribute authorship. **Asker-pull, not bulk crawl** — the bulk corpus comes
   from GH Archive + BigQuery, never from crawling the API at scale.

`manifest.json` is the canonical config; `create.html` pre-fills GitHub's creation screen from it
(the [GitHub App Manifest flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)).

## Permissions — minimal and read-only by design

| Grant | Why | Note |
|---|---|---|
| `contents: read` | read blobs/commits/trees for fingerprinting + history | **read-only — the App never writes to a repo** |
| `metadata: read` | mandatory baseline | — |
| `email_addresses: read` | identify the signing-in user (OAuth) | user-authorized |
| event `push` | keep a tracked repo's provenance fresh | webhook **inactive** until `apps/web` is deployed |

**Why so narrow:** untrusted public-repo content is a prompt-injection / supply-chain vector
(`OPERATIONS.md` §indirect-injection). We only ever *read*, never execute or write, and we request
no more scope than provenance needs. `public: false` until launch — only the owner/org can install
it during dogfooding; flip to `true` when we open the wedge.

## Create it

> Prereq: decide where it lives. The App should ultimately sit in the **MadeBy GitHub org**
> (`PROVISIONING.md` Step 5). You can create it under your personal account first and transfer
> later, but creating it in the org from the start is cleaner.

**Option A — manifest flow (recommended, pre-fills everything):**

```bash
cd infra/github-app
npx serve .            # or any static server — create.html must be served over http to fetch the manifest
# open the printed URL, (optionally) enter the org login, click "Create on GitHub →"
```

Review the pre-filled screen on GitHub and confirm. GitHub creates the App with exactly the
config in `manifest.json`.

**Option B — by hand:** GitHub → Org (or personal) → Settings → Developer settings → GitHub Apps →
*New GitHub App*, and copy the values from `manifest.json`.

## After creation — capture credentials into `.env`

On the new App's settings page:

1. **App ID** → `GITHUB_APP_ID`
2. **Client ID** → `GITHUB_CLIENT_ID`
3. *Generate a new client secret* → `GITHUB_CLIENT_SECRET`
4. *Generate a private key* (downloads a `.pem`) → `GITHUB_APP_PRIVATE_KEY`
   (store the full PEM, newlines escaped as `\n`, or read it from a file at runtime)

These four map 1:1 to the GitHub block in [`.env.example`](../../.env.example). Until `apps/web` is
deployed at `madeby.fyi`, the `redirect_url` / webhook endpoints in the manifest won't resolve yet
— that's fine: create the App and copy the credentials manually; we flip the webhook `active` and
wire the OAuth callback in Step 6.

## Domains referenced (live once Vercel + DNS land)

- OAuth callback: `https://madeby.fyi/api/auth/callback/github` (Auth.js convention)
- Webhook: `https://madeby.fyi/api/github/webhook` (currently `active: false`)
- Post-install setup: `https://madeby.fyi/settings/github`
