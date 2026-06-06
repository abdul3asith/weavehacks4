"use client";
import type { Block as BlockType, Persona } from "@/lib/ui-contract";
import { THEMES } from "./Theme";
import { Block } from "./Block";

export function Renderer({ persona, blocks }: { persona: Persona; blocks: BlockType[] }) {
  const theme = THEMES[persona];
  return (
    <div style={{ background: theme.bg, minHeight: 520, padding: "44px 28px", transition: "background 0.4s ease" }}>
      <div style={{ maxWidth: theme.measure, margin: "0 auto" }}>
        {blocks.map((block, i) => (
          <div key={i} style={{ animation: "fade 0.45s ease both", animationDelay: `${i * 0.06}s` }}>
            <Block block={block} theme={theme} persona={persona} />
          </div>
        ))}
      </div>
    </div>
  );
}