import type { Persona } from "@/lib/ui-contract";

export function detectPersona(text: string): Persona | null {
  const t = text.toLowerCase();
  if (/(research|academic|citation|paper|scholar|phd|literature)/.test(t)) return "researcher";
  if (/(develop|engineer|\bcode\b|coding|programmer|cli|api|technical)/.test(t)) return "developer";
  if (/(business|exec|executive|manager|stakeholder|roi|team member|leadership)/.test(t)) return "business";
  if (/(designer|design|aesthetic|visual|portfolio|figma|typography)/.test(t)) return "designer";
  if (/(journalist|reporter|story|article|newsroom|longform|magazine)/.test(t)) return "journalist";
  if (/(student|study|studying|homework|class|assignment|lecture|exam)/.test(t)) return "student";
  if (/(marketer|marketing|launch|pitch|brand|campaign|landing page|copywriter)/.test(t)) return "marketer";
  if (/(user|beginner|simple|kid|child|explain like|eli5|friendly|new to)/.test(t)) return "enduser";
  return null;
}