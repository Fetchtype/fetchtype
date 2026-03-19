# MCP server

fetchtype includes a Model Context Protocol (MCP) server that exposes 12 tools for AI agent integration. Any MCP-compatible client (Claude, Cursor, Windsurf, custom agents) can validate, generate, search fonts, and export tokens programmatically.

## Setup

```bash
fetchtype mcp
```

This starts the MCP server over stdio. Configure it in your client's MCP settings:

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

## Tools

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `fetchtype_validate` | Validate a token file | `input` (file path) |
| `fetchtype_build` | Export tokens to any format | `input`, `format`, `outDir` |
| `fetchtype_init` | Generate starter tokens | `preset`, `prompt`, `output` |
| `fetchtype_presets` | List available presets | — |
| `fetchtype_suggest` | Font recommendations by context | `context` (display, interface, reading, mono, editorial, data) |
| `fetchtype_pair` | Font pairing recommendations | `font` (font name) |
| `fetchtype_search` | Search the font registry | `query`, `context`, `maxSize` |
| `fetchtype_resolve` | Full font metadata | `font` (font name) |
| `fetchtype_audit` | Scan project for typography issues | `dir` (directory path) |
| `fetchtype_prepare` | Download and optimize web fonts | `input` (token file) |
| `fetchtype_generate` | One-call validated token generation | `context`, `budget`, `accessibility` |
| `fetchtype_drift` | Compare token snapshots | `baseline`, `current` |

## Response format

All MCP tool responses include structured decision fields for seamless agent workflows:

```json
{
  "decision": "pass | fail | suggest",
  "confidence": 0.95,
  "result": { ... },
  "alternatives": [ ... ],
  "nextAction": "Suggested next step for the agent"
}
```

- `decision` — outcome classification
- `confidence` — how confident the tool is in its result (0–1)
- `alternatives` — other options the agent could consider
- `nextAction` — what the agent should do next (e.g., "Run fetchtype_build to export tokens")

## One-call token generation

The `fetchtype_generate` tool lets agents create a complete, validated token file in a single call:

```
Input:  context="saas-dashboard", budget="100kb", accessibility="wcag-aa"
Output: Complete fetchtype.tokens.json that passes all 20 rules
```

No multi-step workflow needed — describe the constraints, get back validated tokens.

## Example agent workflow

1. Agent receives task: "Set up typography for a dashboard app"
2. `fetchtype_suggest` → get font recommendations for `interface` context
3. `fetchtype_pair` → get pairing for the chosen font
4. `fetchtype_generate` → create validated tokens with constraints
5. `fetchtype_build` → export to Tailwind config
6. Agent writes the config into the project

Or skip steps 2–4 with `fetchtype_generate` for a single-call flow.
