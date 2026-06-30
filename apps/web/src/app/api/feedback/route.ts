import { NextResponse } from "next/server";
import { validateCorrection } from "@/lib/feedback";
import { recordCorrection } from "@/lib/corrections-store";
import { track, FUNNEL } from "@/lib/analytics";

// Writes the append-only label store → Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST a correction from the analyze/resolver result. Server-only (no client JS): a plain form
// posts here, we record + fire the funnel event, then 303 back with a thanks flag.
export async function POST(req: Request) {
  const form = await req.formData();
  const input = {
    repo: form.get("repo"),
    kind: form.get("kind"),
    correction: form.get("correction"),
    note: form.get("note"),
  };
  const result = validateCorrection(input as Record<string, unknown>, new Date().toISOString());

  const repo = typeof input.repo === "string" ? input.repo : "";
  const back = new URL(`/analyze${repo ? `?repo=${encodeURIComponent(repo)}` : ""}`, req.url);

  if ("error" in result) {
    back.searchParams.set("fb", "error");
    return NextResponse.redirect(back, 303);
  }

  await recordCorrection(result);
  // The same action is a conversion signal: a correction is the moment a user is most likely to
  // claim & verify ("fix my number"). One primitive, three jobs.
  await track(FUNNEL.feedbackSubmitted, { repo: result.repo, kind: result.kind });

  back.searchParams.set("fb", "thanks");
  return NextResponse.redirect(back, 303);
}
