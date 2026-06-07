import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import type { Block, Persona } from "../ui-contract";
import { THEMES, type Theme } from "@/components/render/Theme";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";
import { runThemeAgent } from "./theme-agent";

// In-process LangGraph. Two parallel branches from START:
//   write_content -> compose_ui   (prose -> Block[])
//   pick_theme                    (topic-aware Theme, add-on)
// Streaming its node updates drives the live "writing -> composing -> done".
// The adaptive-agent marks "done" only after the whole graph drains, so the
// final snapshot always carries both blocks AND theme.
export const AdaptiveState = Annotation.Root({
  request: Annotation<string>(),
  persona: Annotation<Persona>(),
  status: Annotation<string>(),
  content: Annotation<string>(),
  blocks: Annotation<Block[]>(),
  // Dynamic, topic-aware theme (add-on); falls back to THEMES[persona].
  theme: Annotation<Theme | undefined>(),
  // Optional steering from chat commands.
  depth: Annotation<"simpler" | "deeper" | undefined>(),
  directives: Annotation<string[] | undefined>(),
  // Prior questions in the same conversation (for follow-up context).
  history: Annotation<string[] | undefined>(),
});

type S = typeof AdaptiveState.State;

async function contentNode(state: S): Promise<Partial<S>> {
  const content = await runContentAgent({ request: state.request, persona: state.persona, depth: state.depth, history: state.history });
  return { content, status: "composing" };
}

async function composeNode(state: S): Promise<Partial<S>> {
  const blocks = await runUIComposer({ persona: state.persona, content: state.content, directives: state.directives });
  return { blocks };
}

async function themeNode(state: S): Promise<Partial<S>> {
  try {
    return { theme: await runThemeAgent({ request: state.request, persona: state.persona }) };
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
