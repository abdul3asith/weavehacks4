// The FIXED component menu. The ui-composer agent will emit Block[] matching
// these shapes — it may pick and order blocks, but never invent new types.

export type Persona = "researcher" | "developer" | "business" | "enduser";

// Inline text pieces inside a paragraph
export type TextRun = string | { sup: string } | { code: string };

// Code highlighting token: [class, text]
export type CodeClass = "k" | "t" | "s" | "fn";
export type CodeToken = [CodeClass, string];

// Terminal line: prompt / command / output
export type TerminalLine = { p?: string; c?: string; o?: string };

// A bibliography / reference entry. Plain string (legacy) or a citation with an
// optional link, so researcher references can be clickable.
export type Reference = string | { text: string; href?: string };

// A flowchart described as DATA (not a text DSL), so it can never have a
// "syntax error" — the renderer lays it out as SVG.
export type DiagramNode = { id: string; label: string };
export type DiagramEdge = { from: string; to: string; label?: string };

export type Block =
  | { type: "heading"; title: string; subtitle?: string }
  | { type: "byline"; text: string }
  | { type: "prose"; runs: TextRun[] }
  | { type: "callout"; kind?: string; title: string; body: string }
  | { type: "references"; items: Reference[] }
  | { type: "terminal"; lines: TerminalLine[] }
  | { type: "code"; lang: string; tokens: CodeToken[][] }
  | { type: "steps"; items: string[] }
  | { type: "links"; items: { label: string; href: string }[] }
  | { type: "tldr"; body: string }
  | { type: "keypoints"; items: { h: string; t: string }[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "footnote"; text: string }
  | { type: "analogy"; emoji: string; title: string; body: string }
  | { type: "visual" }
  | { type: "faq"; items: { q: string; a: string }[] }
  // Flowchart as data: the agent emits nodes + directed edges; we render SVG.
  | { type: "diagram"; nodes: DiagramNode[]; edges: DiagramEdge[]; caption?: string };

export interface UISpec {
  persona: Persona;
  blocks: Block[];
}