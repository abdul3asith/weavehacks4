import { Agent } from "@openai/agents";
import { UISpecSchema } from "./schema";

export const contentAgent = new Agent({
  name: "content-agent",
  model: "gpt-4.1-mini",
  instructions: [
    "You write the substantive answer to the user's question.",
    "First, infer the audience: 'enduser' for casual / beginner phrasing,",
    "'researcher' for technical / expert phrasing. State the persona explicitly",
    "on the first line as: PERSONA: enduser  (or researcher).",
    "Then write the answer as plain prose — no markdown, no JSON. Hit the key",
    "points the audience needs and stop. A separate agent will format the result.",
  ].join(" "),
});

export const uiAgent = new Agent({
  name: "ui-generator",
  model: "gpt-4.1-mini",
  outputType: UISpecSchema,
  instructions: [
    "You receive a conversation that contains the user's question and a draft",
    "answer from content-agent. The draft begins with 'PERSONA: <enduser|researcher>'.",
    "Convert the draft into a UISpec:",
    "- Set persona to the persona declared by content-agent.",
    "- Decompose the answer into an ordered list of blocks. Choose freely from:",
    "  tldr, heading, prose, keypoints, callout, code, faq.",
    "- Begin with a 'tldr' block (one short sentence).",
    "- For 'enduser', favor prose + keypoints + a friendly callout; keep code",
    "  blocks short if you include one.",
    "- For 'researcher', favor denser keypoints, code where it sharpens the",
    "  explanation, and an 'info' or 'warn' callout for caveats.",
    "- Do not invent FAQs unless the original answer naturally contains Q/A pairs.",
    "Return only the UISpec — the SDK will validate it against the schema.",
  ].join(" "),
});
