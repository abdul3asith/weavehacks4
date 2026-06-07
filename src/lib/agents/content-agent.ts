import type { Persona } from "../ui-contract";
import { openai, MODEL } from "../openai";
import { weave } from "../weave";

export interface ContentInput {
  request: string;
  persona: Persona;
  // Prior questions in the same conversation (for follow-up context).
  history?: string[];
}

const DEPTH_NOTE: Record<NonNullable<ContentInput["depth"]>, string> = {
  simpler: " Pitch this NOTICEABLY simpler than usual: shorter sentences, everyday words, fewer concepts, no jargon.",
  deeper: " Go DEEPER than usual: more technical precision, edge cases, trade-offs, and nuance.",
};

// How each persona's explanation should *read*. The ui-composer downstream
// turns this prose into persona-appropriate blocks; here we only set voice.
const VOICE: Record<Persona, string> = {
  researcher:
    "an academic reviewer. Precise, formal prose. Make cite-able, falsifiable claims and note methodological caveats. No marketing tone.",
  developer:
    "a senior engineer briefing another engineer. Terse and technical. Favor concrete commands, code, and step-by-step setup over prose.",
  business:
    "an exec-brief writer. Lead with the bottom line. Short, outcome-oriented, ROI/risk framing. No code, no jargon.",
  enduser:
    "a friendly teacher explaining to a curious beginner. Warm, plain language, analogies, no jargon. Assume zero background.",
  designer:
    "a design critic writing for designers. Concrete about composition, typography, color, hierarchy, and visual reference points. Treat the topic as something that has a look and a feel as well as a function.",
  journalist:
    "a longform journalist. Open with a scene or lede that grounds the reader, then move into the explanation in a narrative arc. Plain language, vivid specifics, attributed claims where they matter.",
  student:
    "a curious, careful student taking study notes. Define terms before using them, work through the logic step by step, and ask the obvious follow-up questions a learner would have. Friendly but precise.",
  marketer:
    "a product marketer writing copy. Lead with the benefit and the audience. Short, punchy sentences. Concrete outcomes over abstract features. No jargon and no internal-team voice.",
};

// Writes the explanation in the target persona's voice. Wrapped with weave.op
// so it appears as a child span under the orchestrator in the Weave trace tree.
export const runContentAgent = weave.op(
  async function runContentAgent({ request, persona, history }: ContentInput): Promise<string> {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            `You are ${VOICE[persona]}\n\n` +
            "Write a self-contained explanation answering the user's request. " +
            "Cover what it is, why it matters, and how it works. " +
            "Return prose only — no markdown headers, no block formatting. " +
            "Another system will lay this out into UI components." +
            (history && history.length
              ? ` This is a follow-up in an ongoing conversation. Earlier the user asked: "${history.join('"; "')}". ` +
                "Answer the NEW request in that context — assume they've seen the earlier material and do not repeat it."
              : ""),
        },
        { role: "user", content: request },
      ],
    });

    return res.choices[0]?.message?.content?.trim() ?? "";
  },
  { name: "content-agent" }
);
