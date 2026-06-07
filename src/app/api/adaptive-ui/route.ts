import { initWeave } from "@/lib/weave";
import { orchestrate } from "@/lib/agents/orchestrator";
import { detectPersona } from "@/lib/detect-persona";
import { PERSONAS, type Persona } from "@/lib/ui-contract";

// POST { request: string, persona?: Persona } -> { persona, blocks }
// Runs the traced 3-agent pipeline server-side (keys never reach the client).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const request = typeof body.request === "string" ? body.request.trim() : "";
    if (!request) {
      return Response.json({ error: "missing 'request'" }, { status: 400 });
    }

    // Trust an explicit persona if valid; otherwise detect from the text.
    const persona: Persona = PERSONAS.includes(body.persona)
      ? body.persona
      : detectPersona(request) ?? "enduser";

    await initWeave();
    const { blocks, theme } = await orchestrate({ request, persona });
    return Response.json({ persona, blocks, theme });
  } catch (err) {
    console.error("[adaptive-ui] pipeline failed:", err);
    return Response.json({ error: "pipeline failed" }, { status: 500 });
  }
}
