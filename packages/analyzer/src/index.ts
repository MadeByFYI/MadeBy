// @madeby/analyzer — the curiosity mirror's engine: git history → classify → breakdown.
// Node-only (reads git). Composes @madeby/classify; commit-level in v0.

export { readGitLog } from "./git";
export { analyzeCommits } from "./analyze";
export type { AnalysisResult } from "./analyze";
export { badgeSnippet } from "./badge";
