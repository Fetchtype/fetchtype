# Changelog

All notable changes to fetchtype are documented here.

## [0.2.1] - 2026-03-22

### Changed
- Updated npm package metadata (keywords, repository URL, bugs link)

## [0.2.0] - 2026-03-16

### Added
- Typography governance: `.fetchtype.json` config with extends chains, font allowlist/blocklist, shareable profiles (recommended, strict, accessibility)
- SARIF 2.1.0 CI output for GitHub Code Scanning
- Typography drift detection (`fetchtype drift`)
- Pre-commit hook (`fetchtype check --install-hook`)
- VS Code extension scaffold with diagnostics on save
- Agent-first intelligence: context scores for 1929 fonts, algorithmic pairings (16K+ recommendations), per-font size guidance
- `fetchtype generate` for deterministic token generation from context and constraints
- Registry API v2: batch, compare, and stack endpoints
- 5 new validation rules (font weight, axis range, subset coverage, display strategy, preload count)

## [0.1.1] - 2026-03-09

### Fixed
- README and package metadata for npm display

## [0.1.0] - 2026-03-09

### Added
- CLI with `init`, `validate`, and `build` commands
- 20 validation rules covering accessibility, readability, and structural consistency
- Export to CSS, JSON, Tailwind, shadcn, and W3C Design Tokens
- 10 presets (base, editorial, dashboard, ecommerce, docs, fluent, material, carbon, spectrum, radix)
- Google Fonts registry with 1929 fonts and enriched metadata
- Font pairing engine with curated and algorithmic recommendations
- MCP server with 10 tools for AI agent integration
- GitHub Action for CI validation
- Typography audit for existing projects (`fetchtype audit`)
- Natural language init (`fetchtype init --prompt`)
