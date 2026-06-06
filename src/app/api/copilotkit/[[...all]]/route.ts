import {
  CopilotRuntime,
  BuiltInAgent,
  createCopilotEndpoint,
} from "@copilotkit/runtime/v2";

// Default agent backing <CopilotKit>. Uses OpenAI (OPENAI_API_KEY in .env.local).
const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: "openai/gpt-4.1-mini",
      apiKey: process.env.OPENAI_API_KEY,
    }),
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
