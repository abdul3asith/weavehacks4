import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { Block, CodeToken, Persona, TextRun } from "../ui-contract";
import { openai, MODEL } from "../openai";
import { weave } from "../weave";

export interface ComposerInput {
  persona: Persona;
  content: string;
  // Optional layout steering from chat commands (e.g. "include a diagram").
  directives?: string[];
}

// ---------------------------------------------------------------------------
// LLM-facing schema. Mirrors the ui-contract Block union, with two deliberate
// simplifications so OpenAI structured output stays reliable:
//   - prose.runs is string[] (the contract's TextRun also accepts plain strings)
//   - code is { lang, source } (a flat string) instead of CodeToken[][]
// OpenAI strict mode requires every field to be "required", so contract-optional
// fields (heading.subtitle, callout.kind, terminal line parts) are .nullable().
// toBlocks() below normalizes this back into exact ui-contract Block shapes.
// ---------------------------------------------------------------------------
const HeadingS = z.object({ type: z.literal("heading"), title: z.string(), subtitle: z.string().nullable() });
const BylineS = z.object({ type: z.literal("byline"), text: z.string() });
const ProseS = z.object({ type: z.literal("prose"), runs: z.array(z.string()) });
const CalloutS = z.object({ type: z.literal("callout"), kind: z.string().nullable(), title: z.string(), body: z.string() });
const ReferencesS = z.object({
  type: z.literal("references"),
  // Each citation is full text plus an optional URL (null when none) so the
  // researcher bibliography can be clickable.
  items: z.array(z.object({ text: z.string(), href: z.string().nullable() })),
});
const TerminalS = z.object({
  type: z.literal("terminal"),
  lines: z.array(z.object({ p: z.string().nullable(), c: z.string().nullable(), o: z.string().nullable() })),
});
const CodeS = z.object({ type: z.literal("code"), lang: z.string(), source: z.string() });
const StepsS = z.object({ type: z.literal("steps"), items: z.array(z.string()) });
const LinksS = z.object({ type: z.literal("links"), items: z.array(z.object({ label: z.string(), href: z.string() })) });
const TldrS = z.object({ type: z.literal("tldr"), body: z.string() });
const KeypointsS = z.object({ type: z.literal("keypoints"), items: z.array(z.object({ h: z.string(), t: z.string() })) });
const TableS = z.object({ type: z.literal("table"), columns: z.array(z.string()), rows: z.array(z.array(z.string())) });
const FootnoteS = z.object({ type: z.literal("footnote"), text: z.string() });
const AnalogyS = z.object({ type: z.literal("analogy"), emoji: z.string(), title: z.string(), body: z.string() });
const VisualS = z.object({ type: z.literal("visual") });
const FaqS = z.object({ type: z.literal("faq"), items: z.array(z.object({ q: z.string(), a: z.string() })) });
// Flowchart as data: nodes + directed edges. No DSL -> no syntax errors.
const DiagramS = z.object({
  type: z.literal("diagram"),
  nodes: z.array(z.object({ id: z.string(), label: z.string() })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().nullable() })),
  caption: z.string().nullable(),
});

const BlockS = z.discriminatedUnion("type", [
  HeadingS, BylineS, ProseS, CalloutS, ReferencesS, TerminalS, CodeS, StepsS,
  LinksS, TldrS, KeypointsS, TableS, FootnoteS, AnalogyS, VisualS, FaqS, DiagramS,
]);

const UISpecS = z.object({ blocks: z.array(BlockS) });
type RawBlock = z.infer<typeof BlockS>;

// Encouraged block palette per persona (the schema permits all 16; this is
// guidance so each persona's layout has a distinct character).
const PALETTE: Record<Persona, string> = {
  researcher: "heading, byline, prose, callout, references, diagram",
  developer: "heading, prose, terminal, code, steps, links, diagram",
  business: "heading, tldr, keypoints, table, footnote, diagram",
  // 'visual' omitted on purpose — its graphic is hardcoded in the locked
  // render layer and can't adapt to the topic, so we never emit it.
  enduser: "heading, prose, analogy, faq, diagram",
  designer: "heading, prose, analogy, keypoints, diagram",
  journalist: "heading, byline, prose, callout, references",
  student: "heading, prose, steps, faq, diagram",
  marketer: "heading, tldr, keypoints, table, links",
};

// Normalize the LLM-facing shapes into exact ui-contract Block values.
// 'visual' is filtered out here too as a hard guarantee (its render is a fixed,
// topic-specific graphic in the locked Block.tsx).
function toBlocks(raw: RawBlock[]): Block[] {
  return raw
    .filter((b) => b.type !== "visual")
    .map((b): Block => {
    switch (b.type) {
      case "prose":
        return { type: "prose", runs: b.runs as TextRun[] };
      case "code":
        return {
          type: "code",
          lang: b.lang,
          // One line -> one row of tokens. "s" = string/plain styling.
          tokens: b.source.split("\n").map((line) => [["s", line] as CodeToken]),
        };
      case "terminal":
        return {
          type: "terminal",
          lines: b.lines.map((l) => ({
            ...(l.p != null ? { p: l.p } : {}),
            ...(l.c != null ? { c: l.c } : {}),
            ...(l.o != null ? { o: l.o } : {}),
          })),
        };
      case "heading":
        return { type: "heading", title: b.title, ...(b.subtitle != null ? { subtitle: b.subtitle } : {}) };
      case "callout":
        return { type: "callout", title: b.title, body: b.body, ...(b.kind != null ? { kind: b.kind } : {}) };
      case "references":
        return {
          type: "references",
          items: b.items.map((it) => (it.href != null ? { text: it.text, href: it.href } : it.text)),
        };
      case "diagram":
        return {
          type: "diagram",
          nodes: b.nodes,
          edges: b.edges.map((e) => ({ from: e.from, to: e.to, ...(e.label != null ? { label: e.label } : {}) })),
          ...(b.caption != null ? { caption: b.caption } : {}),
        };
      default:
        // byline, references, steps, links, tldr, keypoints, table, footnote,
        // analogy, visual, faq already match the contract exactly.
        return b;
    }
  });
}

// Turns the persona's explanation into an ordered Block[] from the FIXED menu.
// Wrapped with weave.op so it nests under the orchestrator in the trace tree.
export const runUIComposer = weave.op(
  async function runUIComposer({ persona, content, directives }: ComposerInput): Promise<Block[]> {
    const directiveNote =
      directives && directives.length
        ? " Additional layout directives from the user — follow them: " + directives.join("; ") + ". "
        : "";
    const completion = await openai.beta.chat.completions.parse({
      model: MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You lay out an explanation into UI blocks from a FIXED menu. " +
            "You may pick which block types to use and their order, but you can " +
            "ONLY emit the types defined by the schema — never invent fields or types. " +
            `For the "${persona}" persona, prefer these blocks: ${PALETTE[persona]}. ` +
            "Never emit the 'visual' block. " +
            "The 'diagram' block is a flowchart described as DATA: `nodes` (each with a short " +
            "`id` like 'a','b' and a concise `label`) and `edges` (each `from` an id `to` an id, " +
            "with an optional short `label`). Build a clear directed flow of 4–8 nodes; every edge's " +
            "from/to must reference a node id you defined. Use it when a process/flow/hierarchy " +
            "clarifies the topic (most topics have a useful one). " +
            "For 'references', put the full citation in `text` and a real URL in `href` when one " +
            "exists (else null). " +
            (persona === "researcher"
              ? "You MUST end with a 'references' block: a bibliography of 3–5 real, " +
                "credible citations (author, title, venue/year), with href URLs where known. "
              : "") +
            (persona === "developer"
              ? "Include at least one 'code' block with a concrete, runnable snippet. "
              : "") +
            "Always start with a heading. Use the explanation's real content — " +
            "do not summarize it away. Aim for 4–7 blocks." +
            directiveNote,
        },
        { role: "user", content },
      ],
      response_format: zodResponseFormat(UISpecS, "ui_spec"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) throw new Error("ui-composer: model returned no parsed output");
    return toBlocks(parsed.blocks);
  },
  { name: "ui-composer" }
);
