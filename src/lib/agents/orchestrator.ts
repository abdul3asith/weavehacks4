import type { Block, Persona } from "../ui-contract";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { runThemeAgent } from "./theme-agent";
import { THEMES, type Theme } from "@/components/render/Theme";
import { weave } from "../weave";

export interface OrchestrateInput {
  request: string;
  persona: Persona;
}

export interface OrchestrateOutput {
  blocks: Block[];
  theme: Theme;
}

// The pipeline: write persona-voiced content, lay it out into blocks, and
// pick a topic-aware Theme. Theme has no information dependency on the prose,
// so we kick it off in parallel with the content→composer chain to keep it
// off the critical path. Theme failure is caught here and falls back to the
// static THEMES[persona] so it can never break the pipeline.
//
// Wrapped with weave.op so the trace tree is:
//   orchestrate
//     ├─ theme-agent
//     └─ content-agent
//          └─ ui-composer
export const orchestrate = weave.op(
  async function orchestrate({
    request,
    persona,
  }: OrchestrateInput): Promise<OrchestrateOutput> {
    const themeP = runThemeAgent({ request, persona }).catch((e) => {
      console.warn("[orchestrate] theme-agent fallback:", e);
      return THEMES[persona];
    });
    const content = await runContentAgent({ request, persona });
    const [blocks, theme] = await Promise.all([
      runUIComposer({ persona, content }),
      themeP,
    ]);
    return { blocks, theme };
  },
  { name: "orchestrate" }
);
