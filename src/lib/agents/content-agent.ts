import type { Persona } from "../ui-contract";
import { openai, MODEL } from "../openai";
import { weave } from "../weave";

export interface ContentInput {
  request: string;
  persona: Persona;
}

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
};

// Writes the explanation in the target persona's voice. Wrapped with weave.op
// so it appears as a child span under the orchestrator in the Weave trace tree.
export const runContentAgent = weave.op(
  async function runContentAgent({ request, persona }: ContentInput): Promise<string> {
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
            "Another system will lay this out into UI components.",
        },
        { role: "user", content: request },
      ],
    });

    return res.choices[0]?.message?.content?.trim() ?? "";
  },
  { name: "content-agent" }
);
