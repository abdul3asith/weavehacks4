"use client";
import { Renderer } from "@/components/render/Renderer";
import { detectPersona } from "@/lib/detect-persona";
import { SPECS } from "@/lib/specs";
import { useMemo, useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap');`;

export default function Page() {
  const [input, setInput] = useState("explain langchain for a developer");
  const detected = useMemo(() => detectPersona(input), [input]);
  const persona = detected ?? "enduser";

  const presets = [
    { k: "researcher", label: "Researcher", q: "explain langchain for a researcher" },
    { k: "developer", label: "Developer", q: "explain langchain for a developer" },
    { k: "business", label: "Business", q: "explain langchain for a business team member" },
    { k: "enduser", label: "End user", q: "explain langchain for a new user, keep it simple" },
  ] as const;

  return (
    <div style={{ fontFamily: "'Archivo', sans-serif", background: "#0a0c12", minHeight: "100vh" }}>
      <style>{`${FONT_IMPORT}
        @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
      `}</style>

      <div style={{ padding: "18px 24px", borderBottom: "1px solid #1c2130" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ color: "#5ef2a0", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.1em", marginBottom: 10 }}>
            ADAPTIVE UI · one input → four interfaces
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type something with 'researcher', 'developer', 'business', or 'user'..."
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #2a3142", background: "#11151f", color: "#e6ebf5", fontFamily: "'JetBrains Mono',monospace", fontSize: 14, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {presets.map((p) => (
              <button key={p.k} onClick={() => setInput(p.q)} style={{
                cursor: "pointer", padding: "7px 12px", borderRadius: 7, fontSize: 13, fontFamily: "'Archivo',sans-serif", fontWeight: 600,
                border: persona === p.k ? "1px solid #5ef2a0" : "1px solid #2a3142",
                background: persona === p.k ? "rgba(94,242,160,0.12)" : "transparent",
                color: persona === p.k ? "#5ef2a0" : "#8b97ad",
              }}>{p.label}</button>
            ))}
            <span style={{ marginLeft: "auto", alignSelf: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: detected ? "#5ef2a0" : "#ff9f5e" }}>
              detected: {detected ?? "— (defaulting to end user)"}
            </span>
          </div>
        </div>
      </div>

      <Renderer persona={persona} blocks={SPECS[persona]} />
    </div>
  );
}