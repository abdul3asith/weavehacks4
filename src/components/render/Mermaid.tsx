"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Theme } from "./Theme";

// Renders a Mermaid diagram (flowchart / sequence / pie / xychart / etc.) from
// LLM-authored text. Mermaid runs client-side only, so this is a client
// component that renders into a ref after mount. Theme colors are mapped so the
// diagram matches each persona's palette.
export function Mermaid({ code, theme }: { code: string; theme: Theme }) {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
            background: theme.surface,
            primaryColor: theme.surface,
            primaryTextColor: theme.ink,
            primaryBorderColor: theme.accent,
            lineColor: theme.muted,
            secondaryColor: theme.bg,
            tertiaryColor: theme.bg,
            fontFamily: theme.fontBody,
            fontSize: "14px",
          },
        });
        const id = `m${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "diagram error");
      }
    })();
    return () => { cancelled = true; };
  }, [code, reactId, theme]);

  if (err) {
    // Graceful fallback: show the source so the diagram never blanks the UI.
    return (
      <pre style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 8, padding: "12px 14px", color: theme.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, overflowX: "auto", margin: "4px 0 18px" }}>
        {code}
      </pre>
    );
  }
  return <div ref={ref} style={{ display: "flex", justifyContent: "center", margin: "8px 0 20px" }} />;
}
