import { describe, expect, it } from 'vitest';

import { createMcpServer } from './mcp.js';

type McpToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

type RegisteredTool = {
  handler: McpToolHandler;
};

function getTools(server: ReturnType<typeof createMcpServer>): Record<string, RegisteredTool> {
  return (server as unknown as { _registeredTools: Record<string, RegisteredTool> })
    ._registeredTools;
}

describe('MCP server', () => {
  it('creates a server without errors', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it('registers all tools including fetchtype_workflow', async () => {
    const server = createMcpServer();
    const toolNames = Object.keys(getTools(server));

    expect(toolNames).toContain('fetchtype_validate');
    expect(toolNames).toContain('fetchtype_build');
    expect(toolNames).toContain('fetchtype_suggest');
    expect(toolNames).toContain('fetchtype_init');
    expect(toolNames).toContain('fetchtype_presets');
    expect(toolNames).toContain('fetchtype_systems');
    expect(toolNames).toContain('fetchtype_resolve');
    expect(toolNames).toContain('fetchtype_pair');
    expect(toolNames).toContain('fetchtype_fallback');
    expect(toolNames).toContain('fetchtype_search');
    expect(toolNames).toContain('fetchtype_audit');
    expect(toolNames).toContain('fetchtype_workflow');
    expect(toolNames.length).toBeGreaterThanOrEqual(12);
  });

  describe('fetchtype_workflow', () => {
    it('returns a workflow sequence for a setup goal', async () => {
      const server = createMcpServer();
      const tools = getTools(server);
      const workflowTool = tools['fetchtype_workflow'];
      expect(workflowTool).toBeDefined();

      const result = await workflowTool!.handler({ goal: 'set up typography for a SaaS dashboard' });
      expect(result.isError).toBeFalsy();

      const text = result.content[0]!.text;
      const parsed = JSON.parse(text) as {
        decision: string;
        data: { steps: Array<{ tool: string }> };
      };

      expect(parsed.decision).toMatch(/setup/i);
      const toolNames = parsed.data.steps.map((s) => s.tool);
      expect(toolNames).toContain('fetchtype_suggest');
      expect(toolNames).toContain('fetchtype_pair');
      expect(toolNames).toContain('fetchtype_init');
      expect(toolNames).toContain('fetchtype_validate');
      expect(toolNames).toContain('fetchtype_build');
    });

    it('returns suggest → pair → init → validate → build for setup workflow', async () => {
      const server = createMcpServer();
      const tools = getTools(server);
      const workflowTool = tools['fetchtype_workflow']!;

      const result = await workflowTool.handler({ goal: 'create new typography system' });
      const parsed = JSON.parse(result.content[0]!.text) as {
        data: { workflow: string; steps: Array<{ step: number; tool: string }> };
      };

      expect(parsed.data.workflow).toBe('setup');
      const orderedTools = parsed.data.steps.map((s) => s.tool);
      const suggestIdx = orderedTools.indexOf('fetchtype_suggest');
      const pairIdx = orderedTools.indexOf('fetchtype_pair');
      const initIdx = orderedTools.indexOf('fetchtype_init');
      const validateIdx = orderedTools.indexOf('fetchtype_validate');
      const buildIdx = orderedTools.indexOf('fetchtype_build');

      expect(suggestIdx).toBeLessThan(pairIdx);
      expect(pairIdx).toBeLessThan(initIdx);
      expect(initIdx).toBeLessThan(validateIdx);
      expect(validateIdx).toBeLessThan(buildIdx);
    });

    it('returns audit workflow for audit-focused goals', async () => {
      const server = createMcpServer();
      const tools = getTools(server);
      const workflowTool = tools['fetchtype_workflow']!;

      const result = await workflowTool.handler({ goal: 'audit my existing typography' });
      const parsed = JSON.parse(result.content[0]!.text) as {
        data: { workflow: string };
      };

      expect(parsed.data.workflow).toBe('audit');
    });

    it('includes decision protocol fields in response', async () => {
      const server = createMcpServer();
      const tools = getTools(server);
      const workflowTool = tools['fetchtype_workflow']!;

      const result = await workflowTool.handler({ goal: 'set up fonts' });
      const parsed = JSON.parse(result.content[0]!.text) as {
        decision: string;
        confidence: number;
        alternatives: unknown[];
        constraints: unknown[];
        nextActions: Array<{ tool: string; description: string }>;
        data: unknown;
      };

      expect(typeof parsed.decision).toBe('string');
      expect(typeof parsed.confidence).toBe('number');
      expect(Array.isArray(parsed.alternatives)).toBe(true);
      expect(Array.isArray(parsed.nextActions)).toBe(true);
      expect(parsed.nextActions.length).toBeGreaterThan(0);
      expect(parsed.data).toBeDefined();
    });
  });
});
