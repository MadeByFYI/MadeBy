#!/usr/bin/env bash
# Create a 301 "redirect the whole zone to madeby.fyi (preserve path + query)" rule on each
# secondary domain. Idempotent: re-running overwrites the zone's
# dynamic-redirect ruleset with this single rule.
#
# Prereqs:
#   - Each secondary domain is already added to Cloudflare as its own zone (NS delegated at Gandi).
#   - CLOUDFLARE_API_TOKEN with permissions: Zone:Read + Zone > Dynamic Redirect:Edit (or Zone:Edit).
#   - jq + curl installed.
#
# Usage:  CLOUDFLARE_API_TOKEN=*** ./redirects.sh
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (Zone:Read + Dynamic Redirect:Edit)}"
TARGET="https://madeby.fyi"
DOMAINS=(madebyhi.fyi madebyai.fyi madewithai.fyi madewith.fyi)
API="https://api.cloudflare.com/client/v4"

api() {
  curl -fsS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" "$@"
}

for d in "${DOMAINS[@]}"; do
  zid="$(api "${API}/zones?name=${d}" | jq -r '.result[0].id // empty')"
  if [ -z "${zid}" ]; then
    echo "!! ${d}: zone not found in this account — add it to Cloudflare first (skipping)"
    continue
  fi
  echo ">> ${d} (${zid}): 301 → ${TARGET} (preserve path + query)"
  api -X PUT "${API}/zones/${zid}/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
    --data @- >/dev/null <<JSON
{
  "rules": [
    {
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 301,
          "target_url": { "expression": "concat(\"${TARGET}\", http.request.uri.path)" },
          "preserve_query_string": true
        }
      },
      "expression": "true",
      "description": "301 to madeby.fyi (preserve path + query)",
      "enabled": true
    }
  ]
}
JSON
  echo "   done"
done

echo "All set. Verify:  curl -sI https://madebyai.fyi/foo  # expect: HTTP/2 301, location: https://madeby.fyi/foo"
