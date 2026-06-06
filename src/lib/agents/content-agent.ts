import type { Level } from "./orchestrator";

// Writes the explanation pitched at the target level.
export async function runContentAgent(_request: string, _level: Level): Promise<string> {
  throw new Error("not implemented"); // Step 2: OpenAI, level-conditioned prompt
}