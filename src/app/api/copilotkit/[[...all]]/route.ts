import {
  CopilotRuntime,
  BuiltInAgent,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";
import { AdaptiveAgent } from "@/lib/agents/adaptive-agent";

// "default" = generic chat (BuiltInAgent). "adaptive" = our in-process LangGraph
// CoAgent that streams the persona UI as shared state (STATE_SNAPSHOT events).
const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: "openai/gpt-4.1-mini",
      apiKey: process.env.OPENAI_API_KEY,
      maxSteps: 5,
      prompt:
        "You control an on-screen ADAPTIVE UI that explains a topic, tailored to a persona " +
        "(researcher / developer / business / enduser). The current screen is given to you as context. " +
        "When the user asks to change what is shown, you MUST call the matching tool instead of replying in prose:\n" +
        "- 'show this for a business exec' / 'as a researcher' → switchPersona\n" +
        "- 'make it simpler' / 'ELI5' → simplify ;  'go deeper' / 'more technical' → goDeeper\n" +
        "- 'add a diagram/flowchart' → addDiagram ;  'add a section about X' → appendSection\n" +
        "- 'remove the code/table/diagram' → removeBlock ;  any other edit ('use a table', 'shorten the intro') → refine\n" +
        "If the user asks to explain a NEW topic but the target audience/persona is unclear, call `askPersona` (pass the topic) and let them choose before anything is generated.\n" +
        "Always prefer calling a tool over describing the change. After the tool runs, confirm briefly in one sentence.",
    }),
    adaptive: new AdaptiveAgent(),
  },
});

// Hono app serving /info, /threads, /agent/.../run under the base path.
const app = createCopilotEndpoint({ runtime, basePath: "/api/copilotkit" });

// react-core probes /threads on mount; without CopilotKitIntelligence the
// runtime returns 422. Short-circuit with an empty list so the console stays clean.
const handler = (req: Request) => {
  const { pathname } = new URL(req.url);
  if (req.method === "GET" && pathname === "/api/copilotkit/threads") {
    return new Response(JSON.stringify({ threads: [], nextCursor: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return app.fetch(req);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
