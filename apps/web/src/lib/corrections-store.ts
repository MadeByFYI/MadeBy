// Append-only labeled-data store for corrections. v0 is a local JSONL file (buildable now, on
// localhost); the durable store (Neon) is blocked-on-atlas — swap the two functions then. The
// store IS the eval data-acquisition bridge (feedback.ts → correctionToLabel → #73 calibration).

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type Correction, serializeCorrection, parseCorrection } from "./feedback";

function storePath(): string {
  return process.env.MADEBY_CORRECTIONS_FILE ?? join(process.cwd(), "var", "corrections.jsonl");
}

export async function recordCorrection(c: Correction): Promise<void> {
  const file = storePath();
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, serializeCorrection(c) + "\n", "utf8");
}

export async function readCorrections(): Promise<Correction[]> {
  try {
    const text = await readFile(storePath(), "utf8");
    return text.split("\n").map(parseCorrection).filter((c): c is Correction => c !== null);
  } catch {
    return [];
  }
}
