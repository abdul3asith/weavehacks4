import { run } from "@openai/agents";
import { orchestrator } from "@/lib/agents/orchestrator";
import { UISpecSchema } from "@/lib/agents/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let question: string;
  try {
    const body = await req.json();
    if (typeof body?.question !== "string" || body.question.trim() === "") {
      return Response.json(
        { error: "Body must include a non-empty 'question' string." },
        { status: 400 },
      );
    }
    question = body.question.trim();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await run(orchestrator, question);
    const parsed = UISpecSchema.safeParse(result.finalOutput);
    if (!parsed.success) {
      return Response.json(
        {
          error:
            "Agent pipeline did not return a UISpec. The orchestrator likely",
          finalOutput: result.finalOutput,
          zodIssues: parsed.error.issues,
        },
        { status: 502 },
      );
    }
    return Response.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
