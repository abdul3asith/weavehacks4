import type { Block, Persona } from "../ui-contract";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { weave } from "../weave";

export interface OrchestrateInput {
  request: string;
  persona: Persona;
  depth?: "simpler" | "deeper";
  directives?: string[];
}

// The pipeline: write persona-voiced content, then lay it out into blocks.
// Optional steering (depth/directives) flows from the "refine" chips.
// Wrapped with weave.op so the trace tree is:
//   orchestrate
//     ├─ content-agent
//     └─ ui-composer
export const orchestrate = weave.op(
  async function orchestrate({ request, persona, depth, directives }: OrchestrateInput): Promise<Block[]> {
    const content = await runContentAgent({ request, persona, depth });
    const blocks = await runUIComposer({ persona, content, directives });
    return blocks;
  },
  { name: "orchestrate" }
);
