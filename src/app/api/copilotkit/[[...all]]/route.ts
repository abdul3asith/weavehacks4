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

// All CopilotKit traffic goes through one handler, on every method it uses.
const handler = (req: Request) => app.fetch(req);

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
