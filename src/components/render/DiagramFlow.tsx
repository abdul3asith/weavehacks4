import type { DiagramNode, DiagramEdge } from "@/lib/ui-contract";
import type { Theme } from "./Theme";

// Renders a flowchart from structured data (nodes + edges) as SVG. Because the
// input is data — not a text DSL — this can never throw a "syntax error".
// Layout: a simple layered (top-down) DAG layout computed from the edges.

const W = 172;   // node width
const H = 54;    // node height
const HGAP = 30; // horizontal gap between nodes in a layer
const VGAP = 60; // vertical gap between layers
const PAD = 14;

function wrap(text: string, max = 24): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export function DiagramFlow({ nodes, edges, theme }: { nodes: DiagramNode[]; edges: DiagramEdge[]; theme: Theme }) {
  if (!nodes.length) return null;

  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  // Keep only edges whose endpoints both exist.
  const E = edges.filter((e) => idx.has(e.from) && idx.has(e.to));

  // Longest-path layering via relaxation (cycle-safe: capped iterations).
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let iter = 0; iter < nodes.length; iter++) {
    let changed = false;
    for (const e of E) {
      const d = Math.max(depth.get(e.to)!, depth.get(e.from)! + 1);
      if (d !== depth.get(e.to)) { depth.set(e.to, d); changed = true; }
    }
    if (!changed) break;
  }

  const maxDepth = Math.max(...nodes.map((n) => depth.get(n.id)!));
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  nodes.forEach((n) => layers[depth.get(n.id)!].push(n.id));

  const layerWidth = (c: number) => c * W + (c - 1) * HGAP;
  const fullWidth = Math.max(...layers.map((l) => layerWidth(l.length)));
  const svgW = fullWidth + PAD * 2;
  const svgH = (maxDepth + 1) * H + maxDepth * VGAP + PAD * 2;

  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    const lw = layerWidth(layer.length);
    const startX = PAD + (fullWidth - lw) / 2;
    const y = PAD + li * (H + VGAP);
    layer.forEach((id, j) => pos.set(id, { x: startX + j * (W + HGAP), y }));
  });

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width={svgW} height={svgH} style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }}>
      <defs>
        <marker id="df-arrow" markerWidth="10" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L7,3 L0,6 Z" fill={theme.muted} />
        </marker>
      </defs>

      {E.map((e, i) => {
        const s = pos.get(e.from)!;
        const t = pos.get(e.to)!;
        const x1 = s.x + W / 2;
        const x2 = t.x + W / 2;
        const down = t.y >= s.y;
        const y1 = down ? s.y + H : s.y;
        const y2 = down ? t.y : t.y + H;
        const midY = (y1 + y2) / 2;
        const d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={theme.muted} strokeWidth={1.5} markerEnd="url(#df-arrow)" opacity={0.75} />
            {e.label && (
              <text x={(x1 + x2) / 2} y={midY} fill={theme.muted} fontSize={11} fontFamily={theme.fontBody}
                textAnchor="middle" dominantBaseline="middle" stroke={theme.bgSolid} strokeWidth={4} paintOrder="stroke">
                {e.label}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const lines = wrap(n.label);
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={W} height={H} rx={10} fill={theme.surface} stroke={theme.accent} strokeWidth={1.5} />
            <text x={p.x + W / 2} y={p.y + H / 2} fill={theme.ink} fontSize={13} fontFamily={theme.fontBody}
              textAnchor="middle" dominantBaseline="middle">
              {lines.map((ln, k) => (
                <tspan key={k} x={p.x + W / 2} dy={k === 0 ? -(lines.length - 1) * 7 : 14}>{ln}</tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
