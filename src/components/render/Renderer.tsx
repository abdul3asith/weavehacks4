"use client";
import type { Block as BlockType, Persona } from "@/lib/ui-contract";
import { THEMES, type Theme } from "./Theme";
import { Block } from "./Block";

// Pulls the first quoted family name out of a CSS font stack
// ("'Lora', Georgia, serif" -> "Lora"). Returns null for stacks that have no
// quoted custom family (i.e. only generic / system fonts).
function extractFontFamily(stack: string): string | null {
  const m = stack.match(/['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

function googleFontHref(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
}

export function Renderer({
  persona,
  blocks,
  theme,
}: {
  persona: Persona;
  blocks: BlockType[];
  // Optional so any future static usage still works; falls back to THEMES[persona].
  theme?: Theme;
}) {
  const t = theme ?? THEMES[persona];

  // React 19 hoists <link rel="stylesheet" precedence=...> to <head> from
  // anywhere in the tree, with deduplication by href. This lets the theme
  // agent pick any Google Font and have it actually load. `display=swap`
  // means the page renders in the fallback immediately and swaps in the
  // requested font when it arrives — no blank flash.
  const families = Array.from(
    new Set(
      [extractFontFamily(t.fontBody), extractFontFamily(t.fontDisplay)].filter(
        (f): f is string => !!f
      )
    )
  );

  return (
    <>
      {families.map((family) => (
        <link
          key={family}
          rel="stylesheet"
          precedence="default"
          href={googleFontHref(family)}
        />
      ))}
      <div style={{ background: t.bg, minHeight: 520, padding: "44px 28px", transition: "background 0.4s ease" }}>
        <div style={{ maxWidth: t.measure, margin: "0 auto" }}>
          {blocks.map((block, i) => (
            <div key={i} style={{ animation: "fade 0.45s ease both", animationDelay: `${i * 0.06}s` }}>
              <Block block={block} theme={t} persona={persona} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
