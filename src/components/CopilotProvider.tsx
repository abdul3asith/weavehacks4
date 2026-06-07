"use client";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

// v2 CopilotKit provider. (No separate chat popup — the page's own input is the
// single interface; actions are direct buttons hitting /api/adaptive-ui.)
export function CopilotProvider({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>
      {children}
    </CopilotKitProvider>
  );
}
