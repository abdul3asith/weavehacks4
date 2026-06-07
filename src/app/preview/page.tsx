// TEMPORARY verification page — delete after confirming UI generation works.
// Server component: runs the real agents server-side, renders via <Renderer>.
// Try any topic:  /preview?q=explain%20photosynthesis&persona=researcher
import { initWeave } from "@/lib/weave";
import { orchestrate } from "@/lib/agents/orchestrator";
import { Renderer } from "@/components/render/Renderer";
import { PERSONAS, type Persona } from "@/lib/ui-contract";

export const dynamic = "force-dynamic"; // always re-run the agents on load

export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; persona?: string }>;
}) {
  const sp = await searchParams;
  const request = sp.q?.trim() || "explain langchain for a developer";
  const persona: Persona = PERSONAS.includes(sp.persona as Persona)
    ? (sp.persona as Persona)
    : "developer";

  await initWeave();
  const { blocks, theme } = await orchestrate({ request, persona });

  return (
    <main>
      <div style={{ padding: 8, font: "12px monospace", color: "#5ef2a0", background: "#0a0c12" }}>
        PREVIEW · persona={persona} · q=&quot;{request}&quot; · blocks={blocks.length} · types=
        {blocks.map((b) => b.type).join(",")}
      </div>
      <Renderer persona={persona} blocks={blocks} theme={theme} />
    </main>
  );
}
