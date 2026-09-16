import { describe, it, expect } from "vitest";
import { buildCaptureBody, FUNNEL } from "./analytics";

const NOW = "2026-06-30T00:00:00Z";

describe("buildCaptureBody (PostHog capture payload)", () => {
  it("builds a well-formed event with the api key and timestamp", () => {
    const b = buildCaptureBody(FUNNEL.repoAnalyzed, { repo: "a/b" }, "phc_key", NOW);
    expect(b.api_key).toBe("phc_key");
    expect(b.event).toBe("repo_analyzed");
    expect(b.timestamp).toBe(NOW);
    expect(b.properties).toMatchObject({ repo: "a/b", $lib: "madeby" });
  });

  it("uses distinctId for distinct_id and does not leak it into properties", () => {
    const b = buildCaptureBody(FUNNEL.feedbackSubmitted, { distinctId: "u1", repo: "a/b" }, "k", NOW);
    expect(b.distinct_id).toBe("u1");
    expect("distinctId" in b.properties).toBe(false);
  });

  it("falls back to 'anon' when no distinctId", () => {
    expect(buildCaptureBody(FUNNEL.claimStarted, {}, "k", NOW).distinct_id).toBe("anon");
  });

  it("names the asserted→verified funnel stages", () => {
    expect(Object.values(FUNNEL)).toEqual(["repo_analyzed", "feedback_submitted", "claim_started", "identity_verified"]);
  });
});
