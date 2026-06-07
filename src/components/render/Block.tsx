import type { Block as BlockType, TextRun } from "@/lib/ui-contract";
import React from "react";
import type { Theme } from "./Theme";
import { DiagramFlow } from "./DiagramFlow";
import { CopyButton } from "./CopyButton";

function Runs({ runs, theme }: { runs: TextRun[]; theme: Theme }) {
  return (
    <>
      {runs.map((r, i) => {
        if (typeof r === "string") return <span key={i}>{r}</span>;
        if ("sup" in r) return <sup key={i} style={{ color: theme.tertiary, fontWeight: 700 }}>{r.sup}</sup>;
        if ("code" in r) return (
          <code key={i} style={{
            fontFamily: "'JetBrains Mono', monospace",
            // Derive a subtle tint of secondary at runtime — keeps the chip
            // tonally connected to the persona without adding a new Theme field.
            background: `color-mix(in srgb, ${theme.secondary} 14%, transparent)`,
            color: theme.ink,
            padding: "1px 5px", borderRadius: 4, fontSize: "0.9em",
          }}>{r.code}</code>
        );
        return null;
      })}
    </>
  );
}

// First letter of `text`, plus the rest. Used by the journalist drop-cap.
function splitFirstLetter(text: string): [string, string] {
  const m = text.match(/^(\s*)(\S)([\s\S]*)$/);
  if (!m) return ["", text];
  return [m[2], m[1] + m[3]];
}

// Render a TextRun[] with the first letter pulled out as a drop-cap. The cap
// is rendered float-left so the rest of the paragraph wraps around it; sizing
// + leading is tuned for serif body fonts (the only personas using dropCap).
function ProseWithDropCap({ runs, theme }: { runs: TextRun[]; theme: Theme }) {
  // Find the first plain-string run to take the first letter from.
  const firstStringIdx = runs.findIndex((r) => typeof r === "string");
  if (firstStringIdx === -1) return <Runs runs={runs} theme={theme} />;

  const firstString = runs[firstStringIdx] as string;
  const [cap, rest] = splitFirstLetter(firstString);
  if (!cap) return <Runs runs={runs} theme={theme} />;

  const trailing = [rest, ...runs.slice(firstStringIdx + 1)] as TextRun[];
  return (
    <>
      <span style={{
        float: "left",
        // Use body font (not display) so the cap matches the paragraph it
        // wraps into — sans-cap on serif body looks visually mismatched.
        fontFamily: theme.fontBody,
        color: theme.primary,
        fontSize: "3.6em",
        lineHeight: "0.85",
        padding: "6px 10px 0 0",
        fontWeight: 700,
      }}>{cap}</span>
      <Runs runs={trailing} theme={theme} />
    </>
  );
}

export function Block({
  block, theme, isFirstProse = false,
}: {
  block: BlockType;
  theme: Theme;
  isFirstProse?: boolean;
}) {
  const P = theme.primary;

  switch (block.type) {
    case "heading": {
      const headerInner = (
        <>
          <h1 style={{
            fontFamily: theme.fontDisplay, color: theme.ink, margin: 0,
            fontSize: theme.headingSize,
            fontWeight: theme.headingWeight,
            letterSpacing: theme.headingLetterSpacing,
            lineHeight: 1.05,
          }}>
            {theme.headingPrefix ? <span style={{ color: P }}>{theme.headingPrefix}</span> : null}
            {block.title}
          </h1>
          {block.subtitle && (
            <p style={{ fontFamily: theme.fontBody, color: theme.muted, margin: "8px 0 0", fontSize: theme.subtitleSize, fontStyle: theme.subtitleItalic ? "italic" : "normal", lineHeight: 1.35 }}>
              {block.subtitle}
            </p>
          )}
          {theme.headerDivider && <div style={{ height: 1, background: theme.rule, marginTop: 16 }} />}
        </>
      );
      // headerRail wraps the heading content in a 4px-left-border container,
      // a gallery / editorial signature (designer persona).
      return (
        <header style={{ marginBottom: theme.headingMarginBottom }}>
          {theme.headerRail ? (
            <div style={{ borderLeft: `4px solid ${P}`, paddingLeft: 18 }}>{headerInner}</div>
          ) : headerInner}
        </header>
      );
    }

    case "byline":
      return <p style={{ fontFamily: theme.fontBody, color: theme.muted, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 18px" }}>{block.text}</p>;

    case "prose": {
      const showDropCap = isFirstProse && theme.dropCap;
      return (
        <p style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: theme.proseSize, lineHeight: theme.proseLineHeight, margin: "0 0 18px" }}>
          {showDropCap
            ? <ProseWithDropCap runs={block.runs} theme={theme} />
            : <Runs runs={block.runs} theme={theme} />}
        </p>
      );
    }

    case "callout":
      return (
        <aside style={{ borderLeft: `3px solid ${P}`, background: theme.calloutTint, padding: "14px 16px", margin: "8px 0 22px", borderRadius: "0 6px 6px 0" }}>
          <div style={{ fontFamily: theme.fontBody, fontWeight: 600, color: P, fontSize: 14, marginBottom: 4 }}>{block.title}</div>
          <div style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 15, lineHeight: 1.55, fontStyle: "italic" }}>{block.body}</div>
        </aside>
      );

    case "references":
      return (
        <section style={{ marginTop: 26 }}>
          <div style={{ fontFamily: theme.fontBody, fontVariant: "small-caps", letterSpacing: "0.06em", color: theme.muted, fontSize: 14, borderBottom: `1px solid ${theme.rule}`, paddingBottom: 6, marginBottom: 10 }}>References</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {block.items.map((it, i) => {
              const text = typeof it === "string" ? it : it.text;
              const href = typeof it === "string" ? undefined : it.href;
              return (
                <li key={i} style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 14.5, lineHeight: 1.5, marginBottom: 7 }}>
                  {text}
                  {href && (
                    <>
                      {" "}
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: theme.primary, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>↗ link</a>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      );

    case "terminal":
      return (
        <div style={{ background: "#05080f", border: `1px solid ${theme.rule}`, borderRadius: 8, overflow: "hidden", margin: "4px 0 18px" }}>
          <div style={{ display: "flex", gap: 6, padding: "9px 12px", borderBottom: `1px solid ${theme.rule}` }}>
            {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, lineHeight: 1.7 }}>
            {block.lines.map((ln, i) => (
              <div key={i}>
                {ln.p && <span style={{ color: theme.primary, marginRight: 8 }}>{ln.p}</span>}
                {ln.c && <span style={{ color: theme.ink }}>{ln.c}</span>}
                {ln.o && <span style={{ color: theme.muted }}>{ln.o}</span>}
              </div>
            ))}
          </pre>
        </div>
      );

    case "code": {
      // Syntax colors now come from the theme so light personas get tonal
      // colors readable on `surface` instead of the developer synthwave palette.
      const colors: Record<string, string> = {
        k: theme.codeKeyword,
        t: theme.ink,
        s: theme.codeString,
        fn: theme.codeFunction,
      };
      const source = block.tokens.map((line) => line.map(([, txt]) => txt).join("")).join("\n");
      return (
        <div style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 8, margin: "4px 0 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: `1px solid ${theme.rule}` }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: theme.secondary, fontWeight: 600, letterSpacing: "0.04em" }}>{block.lang}</span>
            <CopyButton text={source} theme={theme} />
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, lineHeight: 1.7, overflowX: "auto" }}>
            {block.tokens.map((line, i) => (
              <div key={i}>{line.length === 0 ? " " : line.map(([cls, txt], j) => <span key={j} style={{ color: colors[cls] }}>{txt}</span>)}</div>
            ))}
          </pre>
        </div>
      );
    }

    case "steps":
      return (
        <ol style={{ listStyle: "none", margin: "4px 0 18px", padding: 0 }}>
          {block.items.map((it, i) => (
            <li key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
              <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 5, background: theme.primary, color: theme.surface, fontFamily: theme.fontBody, fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center" }}>{i + 1}</span>
              <span style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 14.5, lineHeight: 1.5 }}>{it}</span>
            </li>
          ))}
        </ol>
      );

    case "links":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {block.items.map((l, i) => <a key={i} href={l.href} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: theme.primary, textDecoration: "none", border: `1px solid ${theme.rule}`, padding: "6px 10px", borderRadius: 6 }}>→ {l.label}</a>)}
        </div>
      );

    case "tldr": {
      // "wedge" style is a marketer signature: sharp top-right corner, a left
      // stripe in secondary, and no shadow. "soft" is the original rounded
      // box with a tinted shadow derived from primary.
      const isWedge = theme.tldrStyle === "wedge";
      return (
        <div style={{
          background: theme.primary, color: "#fff",
          borderRadius: isWedge ? "4px 4px 4px 0" : 12,
          padding: "18px 20px", margin: "6px 0 22px",
          boxShadow: isWedge ? "none" : `0 8px 24px ${theme.tldrShadow}`,
          borderLeft: isWedge ? `6px solid ${theme.secondary}` : "none",
        }}>
          <div style={{ fontFamily: theme.fontBody, fontWeight: 800, fontSize: 12, letterSpacing: "0.1em", opacity: 0.85, marginBottom: 6 }}>TL;DR</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 16.5, lineHeight: 1.5, fontWeight: 500 }}>{block.body}</div>
        </div>
      );
    }

    case "keypoints":
      return (
        <div style={{ display: "grid", gap: 12, margin: "0 0 22px" }}>
          {block.items.map((it, i) => (
            <div key={i} style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontFamily: theme.fontBody, fontWeight: 700, color: theme.secondary, fontSize: 13, marginBottom: 3, letterSpacing: "0.02em" }}>{it.h}</div>
              <div style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 15, lineHeight: 1.5 }}>{it.t}</div>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 18px", background: theme.surface, borderRadius: 10, overflow: "hidden", border: `1px solid ${theme.rule}` }}>
          <thead>
            <tr>{block.columns.map((c, i) => <th key={i} style={{ textAlign: "left", fontFamily: theme.fontBody, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: theme.ink, padding: "10px 14px" }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${theme.rule}` }}>
                {row.map((cell, j) => <td key={j} style={{ fontFamily: theme.fontBody, fontSize: 14.5, color: j === 0 ? theme.ink : theme.muted, fontWeight: j === 0 ? 600 : 400, padding: "11px 14px" }}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "footnote":
      return <p style={{ fontFamily: theme.fontBody, color: theme.muted, fontSize: 13, lineHeight: 1.5, borderTop: `1px solid ${theme.rule}`, paddingTop: 12 }}>{block.text}</p>;

    case "analogy":
      return (
        <div style={{ background: theme.surface, border: `2px solid ${theme.rule}`, borderRadius: 20, padding: "18px 20px", margin: "6px 0 20px", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ fontSize: 40 }}>{block.emoji}</div>
          <div>
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 600, color: theme.primary, fontSize: 19, marginBottom: 3 }}>{block.title}</div>
            <div style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 16, lineHeight: 1.5, fontWeight: 600 }}>{block.body}</div>
          </div>
        </div>
      );

    case "visual":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", margin: "4px 0 22px" }}>
          {[{ t: "Your question", e: "❓" }, { t: "LangChain links the steps", e: "🔗" }, { t: "Smart answer", e: "✨" }].map((b, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ background: theme.surface, border: `2px solid ${theme.rule}`, borderRadius: 16, padding: "14px 16px", textAlign: "center", minWidth: 110, flex: "1 1 110px" }}>
                <div style={{ fontSize: 26 }}>{b.e}</div>
                <div style={{ fontFamily: theme.fontBody, fontWeight: 700, color: theme.ink, fontSize: 13.5, marginTop: 4 }}>{b.t}</div>
              </div>
              {i < arr.length - 1 && <div style={{ color: theme.primary, fontSize: 24, fontWeight: 800 }}>→</div>}
            </React.Fragment>
          ))}
        </div>
      );

    case "faq":
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {block.items.map((it, i) => (
            <div key={i} style={{ background: theme.surface, borderRadius: 14, padding: "14px 16px", border: `2px solid ${theme.rule}` }}>
              <div style={{ fontFamily: theme.fontDisplay, fontWeight: 600, color: theme.ink, fontSize: 16 }}>{it.q}</div>
              <div style={{ fontFamily: theme.fontBody, color: theme.muted, fontSize: 15, lineHeight: 1.5, marginTop: 4, fontWeight: 600 }}>{it.a}</div>
            </div>
          ))}
        </div>
      );

    case "diagram":
      return (
        <figure style={{ margin: "8px 0 20px" }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 10, padding: "16px 12px" }}>
            <DiagramFlow nodes={block.nodes} edges={block.edges} theme={theme} />
          </div>
          {block.caption && (
            <figcaption style={{ fontFamily: theme.fontBody, color: theme.muted, fontSize: 13, textAlign: "center", marginTop: 8 }}>{block.caption}</figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}
