import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import type { Block, Persona } from "../ui-contract";
import { runContentAgent } from "./content-agent";
import { runUIComposer } from "./ui-composer";

// In-process LangGraph: detect happens in the agent; this graph runs the two
// real work nodes (content -> compose), reusing the existing weave.op agents.
// Streaming its node updates is what drives the live "writing -> composing -> done".
export const AdaptiveState = Annotation.Root({
  request: Annotation<string>(),
  persona: Annotation<Persona>(),
  status: Annotation<string>(),
  content: Annotation<string>(),
  blocks: Annotation<Block[]>(),
  // Optional steering from chat commands (Phase C).
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
  return { blocks, status: "done" };
}

export const adaptiveGraph = new StateGraph(AdaptiveState)
  .addNode("write_content", contentNode)
  .addNode("compose_ui", composeNode)
  .addEdge(START, "write_content")
  .addEdge("write_content", "compose_ui")
  .addEdge("compose_ui", END)
  .compile();
