import { AbstractAgent } from "@ag-ui/client";
import { EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/core";
import { Observable } from "rxjs";
import { detectPersona } from "../detect-persona";
import type { Block, Persona } from "../ui-contract";
import { adaptiveGraph } from "./graph";
import { initWeave } from "../weave";

// Shared state the frontend reads via useAgent(agent).state.
export interface AdaptiveAgentState {
  request: string;
  persona: Persona;
  status: "idle" | "writing" | "composing" | "done";
  content: string;
  blocks: Block[];
}

const EMPTY: AdaptiveAgentState = { request: "", persona: "enduser", status: "idle", content: "", blocks: [] };
const PERSONAS: Persona[] = ["researcher", "developer", "business", "enduser"];

// Custom AG-UI agent: runs the in-process LangGraph and emits STATE_SNAPSHOT
// events per node so the UI streams "writing -> composing -> done" with blocks.
// No LangGraph server needed — the graph runs here in the Node route.
export class AdaptiveAgent extends AbstractAgent {
  constructor() {
    super({ agentId: "adaptive", description: "Generates a persona-tailored adaptive UI (Block[]) and streams its progress." });
  }

  clone() {
    return new AdaptiveAgent();
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const { threadId, runId } = input;
      const emit = (e: Record<string, unknown> & { type: EventType }) =>
        subscriber.next(e as unknown as BaseEvent);
      const snapshot = (s: AdaptiveAgentState) => emit({ type: EventType.STATE_SNAPSHOT, snapshot: s });

      (async () => {
        try {
          await initWeave();

          // Chat commands (Phase C) steer via forwardedProps; otherwise we read
          // the latest user message and detect the persona.
          const fp = (input.forwardedProps ?? {}) as {
            topic?: string;
            personaOverride?: Persona;
            depth?: "simpler" | "deeper";
            directives?: string[];
            history?: string[];
          };
          const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
          const request = String(fp.topic ?? lastUser?.content ?? "").trim() || "explain langchain";
          const persona: Persona =
            fp.personaOverride && PERSONAS.includes(fp.personaOverride)
              ? fp.personaOverride
              : detectPersona(request) ?? "enduser";

          emit({ type: EventType.RUN_STARTED, threadId, runId });
          let state: AdaptiveAgentState = { ...EMPTY, request, persona, status: "writing" };
          snapshot(state);

          // Stream LangGraph node updates -> push a new state snapshot per node.
          const stream = await adaptiveGraph.stream(
            { request, persona, status: "writing", content: "", blocks: [], depth: fp.depth, directives: fp.directives, history: fp.history },
            { streamMode: "updates" }
          );
          for await (const chunk of stream) {
            const update = Object.values(chunk as Record<string, Partial<AdaptiveAgentState>>)[0] ?? {};
            state = { ...state, ...update };
            snapshot(state);
          }

          // Short narration in the chat thread.
          const messageId = `msg_${runId}`;
          emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
          emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: `Rendered a ${persona} interface for: “${request}”.` });
          emit({ type: EventType.TEXT_MESSAGE_END, messageId });

          emit({ type: EventType.RUN_FINISHED, threadId, runId });
          subscriber.complete();
        } catch (err) {
          emit({ type: EventType.RUN_ERROR, message: err instanceof Error ? err.message : String(err) });
          subscriber.error(err);
        }
      })();
    });
  }
}
