import type { Block, Persona } from "../ui-contract";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { weave } from "../weave";

export interface OrchestrateInput {
  request: string;
  persona: Persona;
}

// The pipeline: write persona-voiced content, then lay it out into blocks.
// Wrapped with weave.op so the trace tree is:
//   orchestrate
//     ├─ content-agent
//     └─ ui-composer
export const orchestrate = weave.op(
  async function orchestrate({ request, persona }: OrchestrateInput): Promise<Block[]> {
    const content = await runContentAgent({ request, persona });
    const blocks = await runUIComposer({ persona, content });
    return blocks;
  },
  { name: "orchestrate" }
);
