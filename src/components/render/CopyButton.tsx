"use client";
import { useState } from "react";
import type { Theme } from "./Theme";

// Small clipboard button for code blocks. Client component (uses onClick +
// navigator.clipboard + transient "Copied" state).
export function CopyButton({ text, theme }: { text: string; theme: Theme }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      style={{
        cursor: "pointer", border: `1px solid ${theme.rule}`, borderRadius: 6,
        background: "transparent", color: copied ? theme.primary : theme.muted,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, padding: "3px 9px",
      }}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}
