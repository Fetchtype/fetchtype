# Claude Code Integration

Copy the skill file below into your project to give Claude Code full fetchtype awareness.

## Setup

```bash
mkdir -p .claude/skills/fetchtype
cp docs/agent-integrations/SKILL.md .claude/skills/fetchtype/SKILL.md
```

Or create `.claude/skills/fetchtype/SKILL.md` manually with the content below.

## Skill File

See [SKILL.md](./SKILL.md) — drop it into `.claude/skills/fetchtype/SKILL.md`.

## What it enables

- Claude automatically validates typography tokens when editing design system files
- Suggests `fetchtype validate` after token changes
- Uses MCP tools for font search, pairing, and export when available
- Knows the full token schema, all 20 rules, and all CLI commands
