import OpenAI from "openai";
import { weave } from "./weave";

// One shared client for every agent. weave.wrapOpenAI makes each OpenAI call
// appear as a child span under whatever weave.op() is currently running.
// Server-side only — never import this from a "use client" file.
export const openai = weave.wrapOpenAI(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
);

// Model used by all agents: fast, cheap, supports JSON-schema structured output.
export const MODEL = "gpt-4o-mini";
