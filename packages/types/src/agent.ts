import { z } from 'zod';

export const AgentNextActionSchema = z.object({
  tool: z.string(),
  description: z.string(),
  suggestedArgs: z.record(z.string(), z.unknown()).optional(),
});
export type AgentNextAction = z.infer<typeof AgentNextActionSchema>;

export const AgentDecisionSchema = z.object({
  decision: z.string(),
  confidence: z.number().min(0).max(1),
  alternatives: z
    .array(
      z.object({
        option: z.string(),
        tradeoff: z.string(),
      }),
    )
    .default([]),
  constraints: z.array(z.string()).default([]),
  nextActions: z.array(AgentNextActionSchema).default([]),
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
