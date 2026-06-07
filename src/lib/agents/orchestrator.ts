import type { Block, Persona } from "../ui-contract";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { runThemeAgent } from "./theme-agent";
import { THEMES, type Theme } from "@/components/render/Theme";
import { weave } from "../weave";

export interface OrchestrateInput {
  request: string;
  persona: Persona;
  depth?: "simpler" | "deeper";
  directives?: string[];
}

export interface OrchestrateOutput {
  blocks: Block[];
  theme: Theme;
}

// The pipeline: write persona-voiced content, lay it out into blocks, and pick a
// topic-aware Theme (add-on). Theme has no dependency on the prose, so it runs in
// parallel with the content→composer chain and is kept off the critical path.
// Theme failure falls back to the static THEMES[persona] so it can never break
// the pipeline. Optional steering (depth/directives) flows from the refine path.
//
// Wrapped with weave.op so the trace tree is:
//   orchestrate
//     ├─ theme-agent
//     └─ content-agent
//          └─ ui-composer
export const orchestrate = weave.op(
  async function orchestrate({ request, persona, depth, directives }: OrchestrateInput): Promise<OrchestrateOutput> {
    const themeP = runThemeAgent({ request, persona }).catch((e) => {
      console.warn("[orchestrate] theme-agent fallback:", e);
      return THEMES[persona];
    });
    const content = await runContentAgent({ request, persona, depth });
    const [blocks, theme] = await Promise.all([
      runUIComposer({ persona, content, directives }),
      themeP,
    ]);
    return { blocks, theme };
  },
  { name: "orchestrate" }
);
