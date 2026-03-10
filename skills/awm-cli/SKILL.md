---
name: awm-cli
description: Use when the user asks to manage MCP servers, skills, or workspace configs for AI coding tools (Claude Code, Cursor, Codex, Copilot CLI, Gemini CLI, Windsurf, GitHub Copilot) using the awm CLI. Triggers on requests to register MCPs, add MCPs/skills to a project, import configs, or check registry health.
---

# AWM — Agent Workspace Manager CLI

## Overview

AWM is a local-first CLI that keeps a central registry of MCP servers and skills at `~/.agent-workspace/registry/`, then writes the correct config files into projects for supported AI tools.

**Core pattern:** Register once → add to workspace → auto-applied to all tools.

```
awm init                           # create .awm.json in project root
awm mcp add                        # pick MCPs from registry → apply to all tools
awm skill add                      # pick skills from registry → apply to all tools
```

---

## RULES — Follow These Before Running Any Command

**ALWAYS ask before acting. Never assume.**

1. **Check existing state first** — Run `awm status` if `.awm.json` exists, and `awm mcp list -g` / `awm skill list -g` to see what's in the registry. Do not recreate things that already exist.

2. **Only add what the user explicitly requested** — If the user says "add fetch and memory", add ONLY fetch and memory. Do not add other MCPs or skills, even if they exist in the registry.

3. **Confirm the plan before running** — Before executing any sequence of commands, show the user what you are about to do:
   ```
   I will run:
     awm init                  (creates .awm.json, you pick tools)
     awm mcp add               (you pick: fetch, memory)
   Proceed?
   ```

4. **Run `awm init` only once per project** — It creates `.awm.json`. If it already exists, use `awm status` instead.

5. **`mcp add` and `skill add` auto-apply** — After selection, MCPs and skills are immediately written to all tool config files in the project.

---

## Quick Reference

### Workspace commands

| Command | What it does |
|---------|-------------|
| `awm init` | Interactive: pick tools → create `.awm.json` in cwd |
| `awm status` | Show current project tools, MCPs, skills, lastSync |
| `awm doctor` | Validate registry + `.awm.json` health |

### MCP commands

| Command | What it does |
|---------|-------------|
| `awm mcp register [id]` | Interactive prompt → save MCP to global registry |
| `awm mcp unregister <id>` | Remove MCP from global registry |
| `awm mcp import` | Scan cwd tool config files → register found MCPs |
| `awm mcp add` | Checkbox from registry → add to `.awm.json` + apply to tools |
| `awm mcp delete <id>` | Remove MCP from `.awm.json` + re-apply tools |
| `awm mcp list` | List MCPs in current workspace |
| `awm mcp list -g` | List all MCPs in global registry |
| `awm mcp show <id>` | Print full MCP definition |

### Skill commands

| Command | What it does |
|---------|-------------|
| `awm skill register <name> --from <path>` | Copy dir/file into global registry |
| `awm skill unregister <name>` | Remove skill from global registry |
| `awm skill import` | Scan `.claude/skills/`, `.agents/skills/` → register found skills |
| `awm skill add` | Checkbox from registry → add to `.awm.json` + apply to tools |
| `awm skill delete <name>` | Remove skill from `.awm.json` |
| `awm skill list` | List skills in current workspace |
| `awm skill list -g` | List all skills in global registry |
| `awm skill show <name>` | Print SKILL.md |

### Other commands

| Command | What it does |
|---------|-------------|
| `awm tool list` | List known tool IDs |
| `awm tool show <id>` | Print tool definition JSON |
| `awm setup [--force]` | Re-seed default MCPs and skills into registry |

---

## Common Workflows

### Set up a new project

```bash
# 1. Check registry state
awm mcp list -g
awm skill list -g

# 2. Initialize workspace (interactive: pick tools)
awm init

# 3. Add ONLY the MCPs the user requested
awm mcp add        # checkbox → select fetch, memory (if user asked)

# 4. Add ONLY the skills the user requested
awm skill add      # checkbox → select awm-cli (if user asked)

# 5. Verify
awm status
cat .awm.json
```

### Register a new MCP from a file

To register an MCP defined in a JSON file, use `mcp register` interactively, or import existing tool configs:

```bash
awm mcp import     # scans .mcp.json, .cursor/mcp.json, .gemini/settings.json, etc.
```

### Register a skill

```bash
# From a directory (must contain SKILL.md)
awm skill register clean-arch --from ./skills/clean-arch/

# From a single markdown file
awm skill register tdd --from ./TDD.md
```

---

## Workspace Config — `.awm.json`

Created by `awm init` at the project root:

```json
{
  "tools": ["claude-code", "cursor", "windsurf"],
  "mcps": ["fetch", "memory"],
  "skills": ["awm-cli"],
  "lastSync": "2026-03-08T12:00:00Z"
}
```

- **`tools`** — which AI tools to write configs for in this project
- **`mcps`** — MCP IDs from the global registry active in this project
- **`skills`** — skill names from the global registry active in this project
- **`lastSync`** — timestamp of last `mcp add` or `skill add` apply

---

## Apply Output by Tool

| Tool | MCP file | Format | Skills |
|------|----------|--------|--------|
| `claude-code` | `.mcp.json` | JSON | `.claude/skills/<name>/` |
| `codex` | `.codex/config.toml` | TOML | — |
| `cursor` | `.cursor/mcp.json` | JSON | — |
| `gemini-cli` | `.gemini/settings.json` | JSON | — |
| `github-copilot` | `.vscode/mcp.json` | JSON (`servers`) | — |
| `windsurf` | — | — | — |
| `copilot-cli` | — | — | — |

Notes:
- **claude-code** is the only tool that supports skills.
- **Merge-safe writes** — `mcp add` only touches the MCP root key. All other keys in tool config files are preserved.
- **Env passthrough** — `${env:VAR}` values are written verbatim; the target tool resolves them at runtime.

---

## Default MCPs (pre-installed)

| ID | Command | Notes |
|----|---------|-------|
| `github` | `npx -y @modelcontextprotocol/server-github` | Needs `GITHUB_TOKEN` env var |
| `filesystem` | `npx -y @modelcontextprotocol/server-filesystem` | Local file access |
| `memory` | `npx -y @modelcontextprotocol/server-memory` | Persistent knowledge graph |
| `fetch` | `uvx mcp-server-fetch` | Web fetching (requires `uv`) |

---

## Environment Variable Override

```bash
AWM_REGISTRY=/path/to/registry awm mcp list -g
```

Default registry: `~/.agent-workspace/registry/`
