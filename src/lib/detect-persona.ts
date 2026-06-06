import type { Persona } from "@/lib/ui-contract";

export function detectPersona(text: string): Persona | null {
  const t = text.toLowerCase();
  if (/(research|academic|citation|paper|scholar|phd|literature)/.test(t)) return "researcher";
  if (/(develop|engineer|\bcode\b|coding|programmer|cli|api|technical)/.test(t)) return "developer";
  if (/(business|exec|executive|manager|stakeholder|roi|team member|leadership)/.test(t)) return "business";
  if (/(user|beginner|simple|kid|child|explain like|eli5|friendly|new to)/.test(t)) return "enduser";
  return null;
}