"use client";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

// v2 CopilotKit provider. Unlocks the CoAgents API (useAgent / runAgent) used
// to drive the in-process AdaptiveAgent — see src/lib/agents/adaptive-agent.ts
// and the runtime registration in src/app/api/copilotkit/[[...all]]/route.ts.
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>
      {children}
    </CopilotKitProvider>
  );
}
