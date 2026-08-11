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
export { enrichIdentity, enrichContributors, resolveHandles } from "./enrich";
export type { EnrichOptions } from "./enrich";
// Host-adapter seam (ARCHITECTURE §12): git-native core, host-adapted. GitHub is the reference impl;
// third parties register siblings (Azure DevOps, GitLab, …) through the same registry.
export { registerHostAdapter, getHostAdapter, listHostAdapters, detectCiRange } from "./host/registry";
export { githubAdapter } from "./host/github";
export type { HostAdapter, RepoRef, HostApiOptions } from "./host/types";
export type { IdentityProfile } from "./analyze";
export { captureLocalSpans } from "./capture-local";
export type { CaptureLocalInput, CaptureLocalResult } from "./capture-local";
export { claudeCodeParser, TOOL_PARSERS, detectParser } from "./tool-parsers";
export type { ToolParser, AiEdit } from "./tool-parsers";
