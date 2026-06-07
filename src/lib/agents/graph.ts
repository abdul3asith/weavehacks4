import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import type { Block, Persona } from "../ui-contract";
import type { Theme } from "@/components/render/Theme";
import { THEMES } from "@/components/render/Theme";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { runThemeAgent } from "./theme-agent";

// In-process LangGraph for the live agent path. Two parallel branches from
// START — `write_content → compose_ui` and `pick_theme` — fan back into END.
// Theme has no information dependency on the prose, so running it alongside
// the content/composer chain keeps wall-time ≈ max(theme, content+composer),
// mirroring the existing orchestrator's Promise.all pattern.
//
// The nodes call the existing weave.op-wrapped agents with their main-branch
// signatures (no depth/directives) so the agents themselves stay untouched.
// Streaming this graph from AdaptiveAgent is what drives the live status
// transitions (writing → composing → done).
export const AdaptiveState = Annotation.Root({
  request: Annotation<string>(),
  persona: Annotation<Persona>(),
  status: Annotation<string>(),
  content: Annotation<string>(),
  blocks: Annotation<Block[]>(),
  theme: Annotation<Theme>(),
  // Prior questions in the same conversation, for context-aware follow-ups.
  history: Annotation<string[] | undefined>(),
});

type S = typeof AdaptiveState.State;

async function contentNode(state: S): Promise<Partial<S>> {
  const content = await runContentAgent({
    request: state.request,
    persona: state.persona,
    history: state.history,
  });
  return { content, status: "composing" };
}

async function composeNode(state: S): Promise<Partial<S>> {
  const blocks = await runUIComposer({ persona: state.persona, content: state.content });
  return { blocks, status: "done" };
}

// Theme failures must never break the pipeline — same fallback the static
// orchestrator uses. The catch keeps the LangGraph node from throwing.
async function themeNode(state: S): Promise<Partial<S>> {
  try {
    const theme = await runThemeAgent({ request: state.request, persona: state.persona });
    return { theme };
  } catch (e) {
    console.warn("[graph] theme-agent fallback:", e);
    return { theme: THEMES[state.persona] };
  }
}

export const adaptiveGraph = new StateGraph(AdaptiveState)
  .addNode("write_content", contentNode)
  .addNode("compose_ui", composeNode)
  .addNode("pick_theme", themeNode)
  .addEdge(START, "write_content")
  .addEdge(START, "pick_theme")
  .addEdge("write_content", "compose_ui")
  .addEdge("compose_ui", END)
  .addEdge("pick_theme", END)
  .compile();
