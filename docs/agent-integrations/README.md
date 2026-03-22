# Agent Integrations

Drop-in configuration files that give AI coding agents full fetchtype awareness — validation rules, commands, token schema, and MCP server setup.

## Quick setup

| Tool | File to copy | Destination in your project |
|------|-------------|----------------------------|
| **Claude Code** | [`SKILL.md`](./SKILL.md) | `.claude/skills/fetchtype/SKILL.md` |
| **Cursor** | [`cursor.mdc`](./cursor.mdc) | `.cursor/rules/fetchtype.mdc` |
| **GitHub Copilot** | [`copilot-instructions.md`](./copilot-instructions.md) | `.github/copilot-instructions.md` (append) |
| **Windsurf** | [`windsurf.md`](./windsurf.md) | `.windsurf/rules/fetchtype.md` |
| **Cline** | [`cline.md`](./cline.md) | `.clinerules/fetchtype.md` |
| **Continue** | [`SKILL.md`](./SKILL.md) | `.continue/rules/fetchtype.md` (add frontmatter) |

## What they do

Each file teaches the agent:

1. **Token schema** — the 12 typography contexts, color modes, hierarchy, spacing, layout
2. **Validation** — all 20 rules and when to run them
3. **Commands** — every CLI command with flags
4. **MCP server** — config snippet for direct tool access
5. **Workflow** — always validate after token changes, export to the right format

## MCP server (all tools)

The fastest integration is the MCP server — it works with any MCP-compatible client:

```json
{
  "mcpServers": {
    "fetchtype": {
      "command": "npx",
      "args": ["fetchtype", "mcp"]
    }
  }
}
```

This gives the agent 12 tools for validation, font search, pairing, export, and more — no file copying needed.
