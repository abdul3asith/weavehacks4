"use client";
import { Renderer } from "@/components/render/Renderer";
import { THEMES, type Theme } from "@/components/render/Theme";
import { detectPersona } from "@/lib/detect-persona";
import type { AdaptiveAgentState } from "@/lib/agents/adaptive-agent";
import type { Block, Persona } from "@/lib/ui-contract";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,600&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;600;700;800;900&family=Nunito:wght@400;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=DM+Sans:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');`;

const STATUS_LABEL: Record<string, string> = {
  writing: "✍️  writing the explanation…",
  composing: "🎨  composing the interface…",
};
const BAR_BG = "#0a0c12";

type Turn = { request: string; persona: Persona; blocks: Block[]; theme: Theme };

// Static header for completed turns — uses the theme captured when that turn
// was generated, so prior turns keep their look even after a new persona run.
function QuestionHeader({ text, theme }: { text: string; theme: Theme }) {
  return (
    <div style={{ maxWidth: theme.measure, margin: "0 auto", padding: "28px 28px 0" }}>
      <div style={{ color: theme.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>YOU ASKED</div>
      <div style={{ color: theme.ink, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 23, lineHeight: 1.25 }}>{text}</div>
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const awaitingCapture = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The CoAgent — useAgent gives us live shared state from STATE_SNAPSHOT
  // events emitted by AdaptiveAgent (src/lib/agents/adaptive-agent.ts).
  const { agent } = useAgent({
    agentId: "adaptive",
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const st = agent.state as Partial<AdaptiveAgentState> | undefined;
  const status = st?.status ?? "idle";
  const running = agent.isRunning;

  // Conversation persona = persona of the turns on screen; during a live run,
  // the live run's persona (so a persona-change re-skins immediately).
  const convPersona: Persona | null = turns[0]?.persona ?? null;
  const persona: Persona = (running ? st?.persona : convPersona) ?? convPersona ?? "enduser";

  // Theme priority: live (from theme-agent during the run) → last turn's
  // captured theme → static fallback. This lets the page background morph as
  // soon as the parallel pick_theme node finishes, even before the blocks
  // are ready.
  const liveTheme = st?.theme;
  const lastTurnTheme = turns.length > 0 ? turns[turns.length - 1].theme : undefined;
  const theme: Theme = (running ? liveTheme : lastTurnTheme) ?? lastTurnTheme ?? THEMES[persona];

  // Capture a finished run into the conversation (once per submit).
  useEffect(() => {
    if (
      status === "done" &&
      awaitingCapture.current &&
      st?.request === pending &&
      (st?.blocks?.length ?? 0) > 0 &&
      st?.theme
    ) {
      const turn: Turn = {
        request: st.request!,
        persona: st.persona!,
        blocks: [...st.blocks!],
        theme: st.theme,
      };
      setTurns((prev) => [...prev, turn]);
      awaitingCapture.current = false;
      setPending(null);
    }
  }, [status, st?.blocks, st?.request, st?.theme, st?.persona, pending]);

  // Auto-scroll to the newest content (ChatGPT behavior).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, pending, status]);

  const submit = useCallback(async () => {
    const q = input.trim();
    if (!q || running) return;
    const detected = detectPersona(q);
    const cur = turns[0]?.persona ?? null;

    let runPersona: Persona;
    let history: string[] = [];
    if (cur === null) {
      runPersona = detected ?? "enduser";            // first turn
    } else if (detected && detected !== cur) {
      runPersona = detected;                          // persona change → clear page
      setTurns([]);
    } else {
      runPersona = cur;                               // follow-up → stay, keep context
      history = turns.map((t) => t.request);
    }

    setInput("");
    setError(null);
    setPending(q);
    awaitingCapture.current = true;
    try {
      await agent.runAgent({ forwardedProps: { topic: q, personaOverride: runPersona, history } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
      awaitingCapture.current = false;
      setPending(null);
    }
  }, [input, running, turns, agent]);

  const started = turns.length > 0 || running;

  const composer = (hero: boolean) => (
    <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, background: "#11151f", border: "1px solid #2a3142", borderRadius: 16, padding: "8px 8px 8px 18px" }}>
      <input
        value={input} autoFocus
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !running) submit(); }}
        placeholder={hero ? "Ask anything — e.g. 'explain CRISPR for a researcher'" : "Ask a follow-up… (name a new audience to start fresh)"}
        style={{ flex: 1, border: "none", background: "transparent", color: "#e6ebf5", fontFamily: "'JetBrains Mono',monospace", fontSize: 15, outline: "none", padding: "8px 0" }}
      />
      <button onClick={() => { if (!running) submit(); }} disabled={running} aria-label="Generate"
        style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 12, border: "none", cursor: running ? "default" : "pointer", background: running ? "#1c2130" : "#5ef2a0", color: running ? "#5ef2a0" : "#0a0c12", fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center" }}>
        {running ? "…" : "↑"}
      </button>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Archivo', sans-serif", background: started ? theme.bg : BAR_BG, transition: "background 0.4s ease" }}>
      <style>{`${FONT_IMPORT}
        @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
        @keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:1} }
      `}</style>

      {!started ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.14em", marginBottom: 14 }}>
            ADAPTIVE UI · LangGraph + CopilotKit
          </div>
          <h1 style={{ color: "#e6ebf5", fontWeight: 800, fontSize: 30, margin: "0 0 22px", textAlign: "center" }}>What do you want to understand?</h1>
          {composer(true)}
          <div style={{ color: error ? "#ff6b6b" : "#5b6678", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginTop: 12, textAlign: "center" }}>
            {error ? `error: ${error}` : "follow-ups continue the chat · name a new audience to re-skin the whole page"}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
            {turns.map((t, i) => (
              <div key={i} style={{ borderTop: i > 0 ? `1px solid ${t.theme.rule}` : undefined, animation: "fade 0.4s ease both" }}>
                <QuestionHeader text={t.request} theme={t.theme} />
                <Renderer persona={t.persona} blocks={t.blocks} theme={t.theme} />
              </div>
            ))}

            {running && (
              <div style={{ borderTop: turns.length > 0 ? `1px solid ${theme.rule}` : undefined }}>
                <QuestionHeader text={pending ?? ""} theme={theme} />
                <div style={{ minHeight: "32vh", display: "grid", placeItems: "center", color: theme.primary, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, animation: "pulse 1.4s ease-in-out infinite" }}>
                  {STATUS_LABEL[status] ?? "running agents…"}
                </div>
              </div>
            )}
          </div>

          <div style={{ flexShrink: 0, padding: "0 16px 26px" }}>
            {error && <div style={{ textAlign: "center", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#ff6b6b" }}>error: {error}</div>}
            {composer(false)}
          </div>
        </>
      )}
    </div>
  );
}
