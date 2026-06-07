import { AbstractAgent } from "@ag-ui/client";
import { EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/core";
import { Observable } from "rxjs";
import { detectPersona } from "../detect-persona";
import { PERSONAS, type Block, type Persona } from "../ui-contract";
import type { Theme } from "@/components/render/Theme";
import { THEMES } from "@/components/render/Theme";
import { adaptiveGraph } from "./graph";
import { initWeave } from "../weave";

// Shared state the frontend reads via useAgent("adaptive").state. The theme
// is part of the snapshot so the renderer can re-skin as soon as pick_theme
// finishes — independent of when compose_ui finishes.
export interface AdaptiveAgentState {
  request: string;
  persona: Persona;
  status: "idle" | "writing" | "composing" | "done";
  content: string;
  blocks: Block[];
  theme: Theme;
}

const EMPTY: AdaptiveAgentState = {
  request: "",
  persona: "enduser",
  status: "idle",
  content: "",
  blocks: [],
  theme: THEMES.enduser,
};

// AG-UI agent: runs the in-process LangGraph and emits one STATE_SNAPSHOT per
// node update so the UI streams writing → composing → done with blocks +
// theme. No LangGraph server — the graph runs here in the Node route.
export class AdaptiveAgent extends AbstractAgent {
  constructor() {
    super({
      agentId: "adaptive",
      description:
        "Generates a persona-tailored adaptive UI (Block[] + Theme) and streams its progress.",
    });
  }

  clone() {
    return new AdaptiveAgent();
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const { threadId, runId } = input;
      const emit = (e: Record<string, unknown> & { type: EventType }) =>
        subscriber.next(e as unknown as BaseEvent);
      const snapshot = (s: AdaptiveAgentState) =>
        emit({ type: EventType.STATE_SNAPSHOT, snapshot: s });

      (async () => {
        try {
          await initWeave();

          // Steering via forwardedProps (set by the frontend's runAgent call);
          // otherwise we read the latest user message and detect persona.
          const fp = (input.forwardedProps ?? {}) as {
            topic?: string;
            personaOverride?: Persona;
            history?: string[];
          };
          const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
          const request =
            String(fp.topic ?? lastUser?.content ?? "").trim() || "explain langchain";
          const persona: Persona =
            fp.personaOverride && PERSONAS.includes(fp.personaOverride)
              ? fp.personaOverride
              : detectPersona(request) ?? "enduser";

          emit({ type: EventType.RUN_STARTED, threadId, runId });
          let state: AdaptiveAgentState = {
            ...EMPTY,
            request,
            persona,
            theme: THEMES[persona],
            status: "writing",
          };
          snapshot(state);

          // Stream LangGraph node updates → push a fresh state snapshot per node.
          // streamMode "updates" yields one chunk per completed node.
          const stream = await adaptiveGraph.stream(
            {
              request,
              persona,
              status: "writing",
              content: "",
              blocks: [],
              theme: THEMES[persona],
              history: fp.history,
            },
            { streamMode: "updates" }
          );
          for await (const chunk of stream) {
            // Parallel branches (pick_theme + write_content) can both complete
            // in a single supersep, so a chunk may carry multiple node updates.
            // Merge every value in deterministic order before snapshotting.
            const updates = Object.values(
              chunk as Record<string, Partial<AdaptiveAgentState>>
            );
            for (const u of updates) state = { ...state, ...u };
            snapshot(state);
          }

          // Short narration in the chat thread so the default agent sees a
          // confirmation when this runs as a sub-agent.
          const messageId = `msg_${runId}`;
          emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
          emit({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: `Rendered a ${persona} interface for: "${request}".`,
          });
          emit({ type: EventType.TEXT_MESSAGE_END, messageId });

          emit({ type: EventType.RUN_FINISHED, threadId, runId });
          subscriber.complete();
        } catch (err) {
          emit({
            type: EventType.RUN_ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          subscriber.error(err);
        }
      })();
    });
  }
}
