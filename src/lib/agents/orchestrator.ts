// Takes { request, level }, decides specialists + which UI to emit.
// Wrap with weave.op() in Step 2 so the whole tree shows in Weave.
export type Level = "7th-grade" | "masters";
export interface OrchestratorInput { request: string; level: Level; }

export async function runOrchestrator(_input: OrchestratorInput) {
  throw new Error("not implemented"); // Step 2: call content agent
}