import { z } from "zod";

export const PersonaSchema = z.enum(["enduser", "researcher"]);
export type Persona = z.infer<typeof PersonaSchema>;

const TldrBlock = z.object({
  kind: z.literal("tldr"),
  text: z.string(),
});

const HeadingBlock = z.object({
  kind: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

const ProseBlock = z.object({
  kind: z.literal("prose"),
  text: z.string(),
});

const KeypointsBlock = z.object({
  kind: z.literal("keypoints"),
  items: z.array(z.string()).min(1),
});

const CalloutBlock = z.object({
  kind: z.literal("callout"),
  tone: z.enum(["info", "warn", "tip"]),
  text: z.string(),
});

const CodeBlock = z.object({
  kind: z.literal("code"),
  language: z.string(),
  code: z.string(),
});

const FaqBlock = z.object({
  kind: z.literal("faq"),
  items: z
    .array(
      z.object({
        q: z.string(),
        a: z.string(),
      }),
    )
    .min(1),
});

export const BlockSchema = z.discriminatedUnion("kind", [
  TldrBlock,
  HeadingBlock,
  ProseBlock,
  KeypointsBlock,
  CalloutBlock,
  CodeBlock,
  FaqBlock,
]);
export type Block = z.infer<typeof BlockSchema>;

export const UISpecSchema = z.object({
  persona: PersonaSchema,
  blocks: z.array(BlockSchema).min(1),
});
export type UISpec = z.infer<typeof UISpecSchema>;
