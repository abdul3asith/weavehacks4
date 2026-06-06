"use client";
import type { UISpec } from "@/lib/ui-contract";

// Step 3: either map spec → custom themed components,
// OR delegate to CopilotKit's A2UI renderer (decide at the booth).
export function Renderer({ spec }: { spec: UISpec | null }) {
  if (!spec) return null;
  return <div>{/* TODO: switch over spec.components */}</div>;
}