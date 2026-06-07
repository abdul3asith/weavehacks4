"use client";
import { Renderer } from "@/components/render/Renderer";
import { THEMES } from "@/components/render/Theme";
import type { AdaptiveAgentState } from "@/lib/agents/adaptive-agent";
import type { Persona } from "@/lib/ui-contract";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { useCallback, useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const STATUS_LABEL: Record<string, string> = {
  writing: "✍️  writing the explanation…",
  composing: "🎨  composing the interface…",
};

const BAR_BG = "#0a0c12";

export default function Page() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { agent } = useAgent({
    agentId: "adaptive",
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const st = agent.state as Partial<AdaptiveAgentState> | undefined;
  const status = st?.status ?? "idle";
  const running = agent.isRunning;
  const persona: Persona = st?.persona ?? "enduser";
  const theme = THEMES[persona];
  const blocks = st?.blocks ?? [];

  const generate = useCallback(async (topic: string) => {
    const t = topic.trim();
    if (!t || agent.isRunning) return;
    setError(null);
    try {
      await agent.runAgent({ forwardedProps: { topic: t } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    }
  }, [agent]);

  const submit = () => { const v = input; setInput(""); generate(v); };

  const started = running || status !== "idle";
  const hasBlocks = !running && status === "done" && blocks.length > 0;

  const composer = (hero: boolean) => (
    <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, background: "#11151f", border: "1px solid #2a3142", borderRadius: 16, padding: "8px 8px 8px 18px" }}>
      <input
        value={input} autoFocus
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !running) submit(); }}
        placeholder={hero ? "Ask anything — e.g. 'explain CRISPR for a researcher'" : "Ask a new question…"}
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
            {error ? `error: ${error}` : "the whole page re-skins to match the audience you describe"}
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ maxWidth: theme.measure, margin: "0 auto", padding: "30px 28px 0" }}>
              <div style={{ color: theme.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>YOU ASKED</div>
              <div style={{ color: theme.ink, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 23, lineHeight: 1.25 }}>{st?.request || input}</div>
            </div>

            {hasBlocks ? (
              <Renderer persona={persona} blocks={blocks} />
            ) : (
              <div style={{ minHeight: "40vh", display: "grid", placeItems: "center", color: theme.accent, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, animation: "pulse 1.4s ease-in-out infinite" }}>
                {STATUS_LABEL[status] ?? "running agents…"}
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
