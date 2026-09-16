// Analytics instrumentation seam. Builds the event-tracking seam now so events fire from the first
// deploy; the PostHog transport activates when POSTHOG_KEY exists. Analytics must NEVER break a
// request — all failures are swallowed.

/** The tracked event names, defined once (analyze → … → identity verified). */
export const FUNNEL = {
  repoAnalyzed: "repo_analyzed",
  feedbackSubmitted: "feedback_submitted",
  claimStarted: "claim_started",
  identityVerified: "identity_verified",
} as const;
export type FunnelEvent = (typeof FUNNEL)[keyof typeof FUNNEL];

export interface CaptureBody {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/** Pure builder for the PostHog /capture payload (unit-tested without network). */
export function buildCaptureBody(
  event: FunnelEvent,
  props: Record<string, unknown>,
  apiKey: string,
  now: string,
): CaptureBody {
  const { distinctId, ...rest } = props;
  return {
    api_key: apiKey,
    event,
    distinct_id: typeof distinctId === "string" && distinctId ? distinctId : "anon",
    properties: { ...rest, $lib: "madeby" },
    timestamp: now,
  };
}

/** Fire a tracked event. No-op (dev log) until POSTHOG_KEY is set; never throws. */
export async function track(event: FunnelEvent, props: Record<string, unknown> = {}): Promise<void> {
  const key = process.env.POSTHOG_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.log(`[analytics] ${event}`, props);
    return;
  }
  const host = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildCaptureBody(event, props, key, new Date().toISOString())),
    });
  } catch {
    // analytics must never break the request
  }
}
