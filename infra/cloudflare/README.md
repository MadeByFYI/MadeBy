# Cloudflare — secondary-domain redirects

The brand consolidates on **`madeby.fyi`**; the four secondaries are held defensively and 301 to
it, preserving path + query (`PROVISIONING.md` Step 4):

`madebyhi.fyi` · `madebyai.fyi` · `madewithai.fyi` · `madewith.fyi`  → `https://madeby.fyi`

> Prereq for either path below: each secondary is added to Cloudflare as its own zone and its
> nameservers are delegated at Gandi (same as the primary in Step 2). The redirect can't be created
> until the zone exists.

## Option A — script (all four at once)

```bash
cd infra/cloudflare
CLOUDFLARE_API_TOKEN=***  ./redirects.sh
```

The token needs **Zone:Read** + **Dynamic Redirect:Edit** (or Zone:Edit). The script looks up each
zone by name and writes a single dynamic-redirect rule; it's idempotent (re-run to update). It
skips—with a warning—any domain not yet added to Cloudflare.

## Option B — dashboard (per domain)

For each secondary zone: **Rules → Redirect Rules → Create rule**.

- **Name:** `301 to madeby.fyi`
- **When incoming requests match:** `All incoming requests` (the rule lives in this zone, so it
  only ever sees this domain's traffic)
- **Then… Type:** `Dynamic`
- **Expression:** `concat("https://madeby.fyi", http.request.uri.path)`
- **Status code:** `301`
- **Preserve query string:** ✅ on

## Verify

```bash
curl -sI https://madebyai.fyi/some/path?x=1
# HTTP/2 301
# location: https://madeby.fyi/some/path?x=1
```

Check all four; confirm the path **and** query survive the redirect.
