"use client";
import { Renderer } from "@/components/render/Renderer";
import type { Theme } from "@/components/render/Theme";
import { detectPersona } from "@/lib/detect-persona";
import { PERSONAS, type Block, type Persona } from "@/lib/ui-contract";
import { useCopilotAction } from "@copilotkit/react-core";
import { useCallback, useMemo, useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Quicksand:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`;

// The input bar — defined at module scope (not inside Page) so it keeps focus
// across re-renders. Used both as the centered hero and the docked footer.
function ChatBar({
  input, setInput, onSubmit, loading, hero,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  hero: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#11151f", border: "1px solid #2a3142", borderRadius: 16,
      padding: "8px 8px 8px 18px",
      boxShadow: hero ? "0 8px 30px rgba(0,0,0,0.35)" : "0 14px 50px rgba(0,0,0,0.55)",
    }}>
      <input
        value={input}
        autoFocus
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !loading) onSubmit(); }}
        placeholder="Ask anything — e.g. 'explain CRISPR for a researcher'"
        style={{ flex: 1, border: "none", background: "transparent", color: "#e6ebf5", fontFamily: "'JetBrains Mono',monospace", fontSize: 15, outline: "none", padding: "8px 0" }}
      />
      <button
        onClick={() => { if (!loading) onSubmit(); }}
        disabled={loading}
        aria-label="Generate"
        style={{
          flex: "0 0 auto", width: 40, height: 40, borderRadius: 12, border: "none",
          cursor: loading ? "default" : "pointer",
          background: loading ? "#1c2130" : "#5ef2a0", color: loading ? "#5ef2a0" : "#0a0c12",
          fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center",
        }}
      >{loading ? "…" : "↑"}</button>
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ persona: Persona; blocks: Block[]; theme: Theme } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detected = useMemo(() => detectPersona(input), [input]);

  const generate = useCallback(async (request: string, p: Persona) => {
    if (!request.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/adaptive-ui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request, persona: p }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { persona: Persona; blocks: Block[]; theme: Theme } = await res.json();
      setResult({ persona: data.persona, blocks: data.blocks, theme: data.theme });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // CopilotKit action: lets the chat assistant trigger the same re-skin.
  useCopilotAction({
    name: "renderAdaptiveUI",
    description: "Generate and render an adaptive UI explaining a topic, tailored to a persona.",
    parameters: [
      { name: "request", type: "string", description: "What to explain", required: true },
      { name: "persona", type: "string", description: `one of: ${PERSONAS.join(", ")}`, required: false },
    ],
    handler: async ({ request, persona: pArg }) => {
      const p = PERSONAS.includes(pArg as Persona) ? (pArg as Persona) : detectPersona(request) ?? "enduser";
      setInput(request);
      await generate(request, p);
      return `Rendered the ${p} UI for: ${request}`;
    },
  });

  const submit = () => generate(input, detected ?? "enduser");
  const started = loading || result !== null;

  return (
    <div style={{ fontFamily: "'Archivo', sans-serif", background: "#0a0c12", minHeight: "100vh" }}>
      <style>{`${FONT_IMPORT}
        @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>

      {!started ? (
        // ---- HERO: plain centered input (ChatGPT-style empty state) ----
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.14em", marginBottom: 14 }}>
            ADAPTIVE UI · one input → eight interfaces
          </div>
          <h1 style={{ color: "#e6ebf5", fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 30, margin: "0 0 22px", textAlign: "center" }}>
            What do you want to understand?
          </h1>
          <div style={{ width: "100%", maxWidth: 640 }}>
            <ChatBar input={input} setInput={setInput} onSubmit={submit} loading={loading} hero />
            <div style={{ color: error ? "#ff6b6b" : "#5b6678", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginTop: 10, textAlign: "center" }}>
              {error ? `error: ${error}` : "the interface re-skins to match the audience you describe"}
            </div>
          </div>
        </div>
      ) : (
        // ---- ACTIVE: generated UI fills the page, input docked at bottom ----
        <>
          <div style={{ paddingBottom: 132, minHeight: "100vh" }}>
            {result ? (
              <Renderer persona={result.persona} blocks={result.blocks} theme={result.theme} />
            ) : (
              <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 14, animation: "pulse 1.4s ease-in-out infinite" }}>
                running agents… composing your interface
              </div>
            )}
          </div>

          <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
            <div style={{ width: "100%", maxWidth: 720, pointerEvents: "auto" }}>
              <div style={{ textAlign: "center", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.08em", color: error ? "#ff6b6b" : "#5b6678" }}>
                {error ? `error: ${error}` : loading ? "running agents…" : result ? `viewing: ${result.persona}` : ""}
              </div>
              <ChatBar input={input} setInput={setInput} onSubmit={submit} loading={loading} hero={false} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
