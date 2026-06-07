import type { Block as BlockType, Persona, TextRun } from "@/lib/ui-contract";
import React from "react";
import type { Theme } from "./Theme";
import { Mermaid } from "./Mermaid";
import { CopyButton } from "./CopyButton";

function Runs({ runs, theme }: { runs: TextRun[]; theme: Theme }) {
  return (
    <>
      {runs.map((r, i) => {
        if (typeof r === "string") return <span key={i}>{r}</span>;
        if ("sup" in r) return <sup key={i} style={{ color: theme.accent, fontWeight: 600 }}>{r.sup}</sup>;
        if ("code" in r) return <code key={i} style={{ fontFamily: "'JetBrains Mono', monospace", background: "rgba(0,0,0,0.07)", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em" }}>{r.code}</code>;
        return null;
      })}
    </>
  );
}

export function Block({ block, theme, persona }: { block: BlockType; theme: Theme; persona: Persona }) {
  const A = theme.accent;

  switch (block.type) {
    case "heading":
      return (
        <header style={{ marginBottom: persona === "enduser" ? 8 : 18 }}>
          <h1 style={{
            fontFamily: theme.fontDisplay, color: theme.ink, margin: 0,
            fontSize: persona === "developer" ? 30 : persona === "enduser" ? 40 : 38,
            fontWeight: persona === "business" ? 800 : persona === "enduser" ? 600 : 600,
            letterSpacing: persona === "business" ? "-0.02em" : persona === "researcher" ? "0" : "-0.01em",
            lineHeight: 1.1,
          }}>
            {persona === "developer" ? <span style={{ color: A }}>$ </span> : null}
            {block.title}
          </h1>
          {block.subtitle && (
            <p style={{ fontFamily: theme.fontBody, color: theme.muted, margin: "8px 0 0", fontSize: persona === "researcher" ? 17 : 15, fontStyle: persona === "researcher" ? "italic" : "normal" }}>
              {block.subtitle}
            </p>
          )}
          {persona === "researcher" && <div style={{ height: 1, background: theme.rule, marginTop: 16 }} />}
        </header>
      );

    case "byline":
      return <p style={{ fontFamily: theme.fontBody, color: theme.muted, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 18px" }}>{block.text}</p>;

    case "prose":
      return (
        <p style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: persona === "researcher" ? 18 : persona === "enduser" ? 18 : 15.5, lineHeight: persona === "researcher" ? 1.7 : 1.65, margin: "0 0 18px" }}>
          <Runs runs={block.runs} theme={theme} />
        </p>
      );

    case "callout":
      return (
        <aside style={{ borderLeft: `3px solid ${A}`, background: "rgba(138,43,43,0.06)", padding: "14px 16px", margin: "8px 0 22px", borderRadius: "0 6px 6px 0" }}>
          <div style={{ fontFamily: theme.fontBody, fontWeight: 600, color: A, fontSize: 14, marginBottom: 4 }}>{block.title}</div>
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
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: theme.accent, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>↗ link</a>
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
                {ln.p && <span style={{ color: theme.accent, marginRight: 8 }}>{ln.p}</span>}
                {ln.c && <span style={{ color: theme.ink }}>{ln.c}</span>}
                {ln.o && <span style={{ color: theme.muted }}>{ln.o}</span>}
              </div>
            ))}
          </pre>
        </div>
      );

    case "code": {
      const colors: Record<string, string> = { k: "#ff7edb", t: theme.ink, s: "#5ef2a0", fn: "#6cb6ff" };
      const source = block.tokens.map((line) => line.map(([, txt]) => txt).join("")).join("\n");
      return (
        <div style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 8, margin: "4px 0 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: `1px solid ${theme.rule}` }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: theme.muted }}>{block.lang}</span>
            <CopyButton text={source} theme={theme} />
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, lineHeight: 1.7, overflowX: "auto" }}>
            {block.tokens.map((line, i) => (
              <div key={i}>{line.length === 0 ? "\u00A0" : line.map(([cls, txt], j) => <span key={j} style={{ color: colors[cls] }}>{txt}</span>)}</div>
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
              <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 5, background: theme.accent, color: "#05080f", fontFamily: theme.fontBody, fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center" }}>{i + 1}</span>
              <span style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 14.5, lineHeight: 1.5 }}>{it}</span>
            </li>
          ))}
        </ol>
      );

    case "links":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {block.items.map((l, i) => <a key={i} href={l.href} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: theme.accent, textDecoration: "none", border: `1px solid ${theme.rule}`, padding: "6px 10px", borderRadius: 6 }}>→ {l.label}</a>)}
        </div>
      );

    case "tldr":
      return (
        <div style={{ background: theme.accent, color: "#fff", borderRadius: 12, padding: "18px 20px", margin: "6px 0 22px", boxShadow: "0 8px 24px rgba(29,78,216,0.25)" }}>
          <div style={{ fontFamily: theme.fontBody, fontWeight: 800, fontSize: 12, letterSpacing: "0.1em", opacity: 0.85, marginBottom: 6 }}>TL;DR</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 16.5, lineHeight: 1.5, fontWeight: 500 }}>{block.body}</div>
        </div>
      );

    case "keypoints":
      return (
        <div style={{ display: "grid", gap: 12, margin: "0 0 22px" }}>
          {block.items.map((it, i) => (
            <div key={i} style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontFamily: theme.fontBody, fontWeight: 700, color: theme.accent, fontSize: 13, marginBottom: 3 }}>{it.h}</div>
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
            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 600, color: theme.accent, fontSize: 19, marginBottom: 3 }}>{block.title}</div>
            <div style={{ fontFamily: theme.fontBody, color: theme.ink, fontSize: 16, lineHeight: 1.5, fontWeight: 600 }}>{block.body}</div>
          </div>
        </div>
      );

    case "visual":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", margin: "4px 0 22px" }}>
          {[{ t: "Your question", e: "\u2753" }, { t: "LangChain links the steps", e: "\uD83D\uDD17" }, { t: "Smart answer", e: "\u2728" }].map((b, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ background: theme.surface, border: `2px solid ${theme.rule}`, borderRadius: 16, padding: "14px 16px", textAlign: "center", minWidth: 110, flex: "1 1 110px" }}>
                <div style={{ fontSize: 26 }}>{b.e}</div>
                <div style={{ fontFamily: theme.fontBody, fontWeight: 700, color: theme.ink, fontSize: 13.5, marginTop: 4 }}>{b.t}</div>
              </div>
              {i < arr.length - 1 && <div style={{ color: theme.accent, fontSize: 24, fontWeight: 800 }}>→</div>}
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
          <div style={{ background: theme.surface, border: `1px solid ${theme.rule}`, borderRadius: 10, padding: "12px 8px" }}>
            <Mermaid code={block.code} theme={theme} />
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