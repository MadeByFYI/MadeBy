// @madeby/analyzer — the curiosity mirror's engine: git history → classify → breakdown.
// Node-only (reads git). Composes @madeby/classify; commit-level in v0.

export { readGitLog } from "./git";
export { analyzeCommits } from "./analyze";
export type { AnalysisResult } from "./analyze";
export { badgeSnippet } from "./badge";
export { analyzeRepo, normalizeRepoUrl, isAnalyzeError } from "./clone";
export type { AnalyzeRepoResult, AnalyzeRepoError, AnalyzeRepoOptions } from "./clone";
export { readSpanManifestsFromDir, readSpanManifestsFromGit, summarizeSpanEvidence } from "./provenance";
export type { SpanEvidence } from "./provenance";
export { readDeclarationFromDir, readDeclarationFromGit, summarizeDeclaration } from "./declaration";
export type { DeclarationEvidence } from "./declaration";
export { detectTooling, readToolingFromGit, readToolingFromDir, AI_TOOL_CONFIGS } from "./tooling";
export type { ToolingEvidence, DetectedTool, AiToolConfig } from "./tooling";
export { resolveGitHubHandle, resolveIdentity } from "./identity";
export type { ResolvedIdentity } from "./identity";
export { enrichIdentity, enrichContributors } from "./enrich";
export type { EnrichOptions } from "./enrich";
export type { IdentityProfile } from "./analyze";
export { captureLocalSpans } from "./capture-local";
export type { CaptureLocalInput, CaptureLocalResult } from "./capture-local";
export { claudeCodeParser, TOOL_PARSERS, detectParser } from "./tool-parsers";
export type { ToolParser, AiEdit } from "./tool-parsers";
