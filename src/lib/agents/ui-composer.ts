import type { UISpec } from "../ui-contract";
import type { Level } from "./orchestrator";

// Outputs a structured UI spec from the FIXED component menu — never invents.
export async function runUIComposer(_content: string, _level: Level): Promise<UISpec> {
  throw new Error("not implemented"); // Step 3: OpenAI structured output
}