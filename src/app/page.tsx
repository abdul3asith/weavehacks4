"use client";
import { Renderer } from "@/components/render/Renderer";
import { detectPersona } from "@/lib/detect-persona";
import type { Block, Persona } from "@/lib/ui-contract";
import { useCallback, useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const PERSONAS: Persona[] = ["researcher", "developer", "business", "enduser"];
const PERSONA_LABEL: Record<Persona, string> = {
  researcher: "Researcher", developer: "Developer", business: "Business", enduser: "End user",
};

type Steer = { persona?: Persona; depth?: "simpler" | "deeper"; directives?: string[] };
type Turn = { request: string; persona: Persona; blocks: Block[] };

// Single ChatGPT-style input. Centered as a hero, or docked at the bottom.
function ChatBar({
  input, setInput, onSubmit, loading, hero,
}: {
  input: string; setInput: (v: string) => void; onSubmit: () => void; loading: boolean; hero: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: "#11151f",
      border: "1px solid #2a3142", borderRadius: 16, padding: "8px 8px 8px 18px",
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
      <button onClick={() => { if (!loading) onSubmit(); }} disabled={loading} aria-label="Generate"
        style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 12, border: "none", cursor: loading ? "default" : "pointer", background: loading ? "#1c2130" : "#5ef2a0", color: loading ? "#5ef2a0" : "#0a0c12", fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center" }}>
        {loading ? "…" : "↑"}
      </button>
    </div>
  );
}

// A small chip button used for the refine / persona options.
function Chip({ label, active, onClick, disabled }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      cursor: disabled ? "default" : "pointer", padding: "7px 13px", borderRadius: 999, fontSize: 13,
      fontFamily: "'Archivo',sans-serif", fontWeight: 600, whiteSpace: "nowrap",
      border: active ? "1px solid #5ef2a0" : "1px solid #2a3142",
      background: active ? "rgba(94,242,160,0.14)" : "#11151f",
      color: disabled ? "#3a4256" : active ? "#5ef2a0" : "#cdd6e6",
      opacity: disabled ? 0.5 : 1,
    }}>{label}</button>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [turn, setTurn] = useState<Turn | null>(null);
  const [asking, setAsking] = useState<string | null>(null); // request being processed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The one code path everything uses: POST the request (+ optional steering)
  // to the proven pipeline route, then show the result.
  const generate = useCallback(async (request: string, steer: Steer = {}) => {
    const req = request.trim();
    if (!req || loading) return;
    setLoading(true);
    setError(null);
    setAsking(req);
    try {
      const res = await fetch("/api/adaptive-ui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: req, persona: steer.persona ?? detectPersona(req) ?? "enduser", depth: steer.depth, directives: steer.directives }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { persona: Persona; blocks: Block[] } = await res.json();
      setTurn({ request: req, persona: data.persona, blocks: data.blocks });
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    } finally {
      setLoading(false);
      setAsking(null);
    }
  }, [loading]);

  const submit = () => generate(input);
  // Refine / switch persona re-run the SAME topic with steering.
  const refine = (steer: Steer) => { if (turn) generate(turn.request, { persona: turn.persona, ...steer }); };
  const switchPersona = (p: Persona) => { if (turn) generate(turn.request, { persona: p }); };

  const started = turn !== null || loading;
  const headerText = asking ?? turn?.request;
  const viewPersona = turn?.persona ?? "enduser";

  return (
    <div style={{ fontFamily: "'Archivo', sans-serif", background: "#0a0c12", minHeight: "100vh" }}>
      <style>{`${FONT_IMPORT}
        @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
        @keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:1} }
      `}</style>

      {!started ? (
        // ---- HERO: centered single input ----
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.14em", marginBottom: 14 }}>
            ADAPTIVE UI · one input → four interfaces
          </div>
          <h1 style={{ color: "#e6ebf5", fontWeight: 800, fontSize: 30, margin: "0 0 22px", textAlign: "center" }}>
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
        // ---- ANSWER: question on top, generated UI below, options, docked input ----
        <div style={{ paddingBottom: 150 }}>
          {/* Question header (like a chat turn) */}
          <div style={{ borderBottom: "1px solid #1c2130", padding: "18px 24px" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <div style={{ color: "#5b6678", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>YOU ASKED</div>
              <div style={{ color: "#e6ebf5", fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 20 }}>{headerText}</div>
              {turn && !loading && (
                <div style={{ color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginTop: 6 }}>persona: {PERSONA_LABEL[viewPersona]}</div>
              )}
            </div>
          </div>

          {/* Output */}
          {loading ? (
            <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 14, animation: "pulse 1.4s ease-in-out infinite" }}>
              running agents… composing your interface
            </div>
          ) : turn ? (
            <>
              <Renderer persona={turn.persona} blocks={turn.blocks} />

              {/* Options — direct, reliable buttons (no LLM tool-calling) */}
              <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 24px 0" }}>
                <div style={{ color: "#5b6678", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", margin: "18px 0 10px" }}>REFINE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  <Chip label="✨ Simpler" onClick={() => refine({ depth: "simpler" })} />
                  <Chip label="🔬 Go deeper" onClick={() => refine({ depth: "deeper" })} />
                  <Chip label="📊 Add diagram" onClick={() => refine({ directives: ["Include a 'diagram' block (a flowchart) illustrating the topic."] })} />
                  <Chip label="📋 Use a table" onClick={() => refine({ directives: ["Summarize key points as a 'table' block."] })} />
                </div>
                <div style={{ color: "#5b6678", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", margin: "0 0 10px" }}>VIEW AS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PERSONAS.map((p) => (
                    <Chip key={p} label={PERSONA_LABEL[p]} active={p === viewPersona} onClick={() => switchPersona(p)} />
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Docked input to ask a new question */}
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
            <div style={{ width: "100%", maxWidth: 720, pointerEvents: "auto" }}>
              {error && <div style={{ textAlign: "center", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#ff6b6b" }}>error: {error}</div>}
              <ChatBar input={input} setInput={setInput} onSubmit={submit} loading={loading} hero={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
