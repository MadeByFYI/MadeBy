// @madeby/analyzer — the curiosity mirror's engine: git history → classify → breakdown.
// Node-only (reads git). Composes @madeby/classify; commit-level in v0.

export { readGitLog } from "./git";
export { analyzeCommits } from "./analyze";
export type { AnalysisResult } from "./analyze";
// Disclosure primitives as library functions — shared by the CLI (check/recognize) and the MCP
// server, and importable by any third party's own runtime (ARCHITECTURE §12).
export { recognizeCommits, evaluateRepoDisclosure } from "./recognize";
export type { RecognizedCommit, RepoDisclosure } from "./recognize";
export { proveRepo } from "./prove";
export type { ProveOptions, ProveResult } from "./prove";
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
import "./host/azure"; // side-effect: register the Azure adapter (bare import survives bundling)
import "./host/gitlab"; // side-effect: register the GitLab adapter
export { registerHostAdapter, getHostAdapter, listHostAdapters, detectCiRange } from "./host/registry";
export { githubAdapter } from "./host/github";
export { azureAdapter } from "./host/azure";
export { gitlabAdapter } from "./host/gitlab";
export type { HostAdapter, RepoRef, HostApiOptions } from "./host/types";
export type { IdentityProfile } from "./analyze";
export { captureLocalSpans } from "./capture-local";
export type { CaptureLocalInput, CaptureLocalResult } from "./capture-local";
export { claudeCodeParser, TOOL_PARSERS, detectParser } from "./tool-parsers";
export type { ToolParser, AiEdit } from "./tool-parsers";
