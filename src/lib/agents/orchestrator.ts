import { Agent } from "@openai/agents";
import { contentAgent, uiAgent } from "./specialists";

export const orchestrator = Agent.create({
  name: "orchestrator",
  model: "gpt-4.1-mini",
  handoffs: [contentAgent, uiAgent],
  instructions: [
    "You are the router for an adaptive-UI pipeline.",
    "Hand off to content-agent first; it will write the answer and then hand",
    "off to ui-generator, which produces a UISpec. Do not answer the user",
    "directly yourself.",
  ].join(" "),
});
