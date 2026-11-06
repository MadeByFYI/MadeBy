#!/usr/bin/env bash
# Can this remote hold git notes? Run it inside a clone of the repo to test (e.g. the Azure DevOps one).
# It attaches a note to HEAD in a throwaway ref (refs/notes/madeby-probe), pushes it, reads it back
# from the remote, then deletes it there and locally. Commits and branches are not touched.
set -uo pipefail
REF=refs/notes/madeby-probe
REMOTE=${1:-origin}
echo "remote: $(git remote get-url "$REMOTE")"
git notes --ref="$REF" add -f -m "madeby notes probe $(date -u +%FT%TZ)" HEAD || exit 1
if git push -q "$REMOTE" "$REF:$REF"; then
  if git ls-remote "$REMOTE" "$REF" | grep -q "$REF"; then echo "RESULT: notes push accepted and readable"; else echo "RESULT: push said ok, but the ref isn't on the remote"; fi
  git push -q "$REMOTE" ":$REF" && echo "cleanup: remote ref deleted" || echo "cleanup: could NOT delete $REF on the remote, remove it by hand"
else
  echo "RESULT: notes push refused (see the error above)"
fi
git update-ref -d "$REF"
