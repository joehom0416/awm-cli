# AWM — Agent Workspace Manager

A local-first CLI for managing MCP servers and skills across AI coding tools.

AWM keeps a **central registry** of MCPs and skills in `~/.agent-workspace/registry/`. Each project has a `.awm.json` file that declares which tools, MCPs, and skills it uses. Running `awm mcp add` or `awm skill add` updates `.awm.json` and immediately writes the right config files for every listed tool.

---

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Workspace Commands](#workspace-commands)
- [MCP Commands](#mcp-commands)
- [Skill Commands](#skill-commands)
- [Tool Command](#tool-command)
- [Doctor Command](#doctor-command)
- [Setup Command](#setup-command)
- [Pull Command](#pull-command)
- [Sync Command](#sync-command)
- [Workspace Config (.awm.json)](#workspace-config-awmjson)
- [Registry Layout](#registry-layout)
- [MCP Definition Format](#mcp-definition-format)
- [Supported Tools](#supported-tools)
- [Environment Variables](#environment-variables)
- [Adding a Custom Tool](#adding-a-custom-tool)

---

## Installation

**Requirements:** Node.js 18 or later.

```bash
# Clone and install dependencies
npm i @joehom/awm-cli -g .
awm --help
```

On install, default MCPs (`github`, `filesystem`, `memory`, `fetch`) and the `awm-cli` skill are seeded into the registry automatically.

---

## Core Concepts

| Concept | What it is |
|---------|-----------|
| **MCP** | A Model Context Protocol server definition stored in the global registry. Describes how to launch a server (command, args, env vars). |
| **Skill** | A folder of instruction files for an AI tool. The registry stores the canonical copy; `skill add` copies it into your project. |
| **Workspace** | A `.awm.json` file at your project root listing which tools, MCPs, and skills are active for that project. |
| **Tool** | A JSON definition that tells AWM where each AI tool stores its MCP config and skill folder. |

The registry is the single source of truth. Tool config files (`.mcp.json`, `.cursor/mcp.json`, etc.) are **generated output** — AWM regenerates them whenever you add or remove MCPs/skills.

---

## Quick Start

```bash
# 1. Go to your project
cd /path/to/your/project

# 2. Initialise workspace — pick which tools to support
awm init

# 3. Add MCPs (checkbox list, auto-applied to all tools)
awm mcp add

# 4. Add skills (checkbox list, auto-applied to all tools)
awm skill add

# 5. Check the workspace state
awm status

# 6. Validate everything is healthy
awm doctor
```

---

## Workspace Commands

### `awm init [--force]`

Create a `.awm.json` in the current directory. Presents a checkbox list of all known tools — select the ones your project uses.

```bash
awm init
```

```
? Select tools to support in this workspace: (Press <space> to select)
❯◯ claude-code
 ◯ codex
 ◯ cursor
 ◯ gemini-cli
 ◯ github-copilot
 ◯ windsurf

[ok] Workspace initialized with tools: claude-code, cursor
     Run "awm mcp add" to add MCPs, "awm skill add" to add skills.
```

Use `--force` to overwrite an existing `.awm.json`.

---

### `awm status`

Show the current workspace state from `.awm.json`.

```bash
awm status
```

```
Workspace status:
  Tools:    claude-code, cursor
  MCPs:     fetch, memory
  Skills:   awm-cli
  lastSync: 2026-03-08T12:00:00Z
```

---

## MCP Commands

MCP definitions are stored as JSON files at `~/.agent-workspace/registry/mcps/<id>.json`.

### `awm mcp register [id]`

Interactively register an MCP server into the global registry. Supply `[id]` to skip the ID prompt.

```bash
awm mcp register
awm mcp register github
```

| Prompt | Description |
|--------|-------------|
| MCP ID | Unique slug, e.g. `github`, `postgres-dev` |
| Transport | `stdio` · `sse` · `http` |
| Command | Executable to run, e.g. `npx`, `node`, `uvx` |
| Args | Space-separated arguments |
| Env vars | Space-separated `KEY=VALUE` pairs |

```
? MCP ID (unique slug): github
? Transport: stdio
? Command: npx
? Args: -y @modelcontextprotocol/server-github
? Env vars: GITHUB_PERSONAL_ACCESS_TOKEN=${env:GITHUB_TOKEN}
[ok] MCP "github" registered in global registry
```

---

### `awm mcp unregister <id>`

Remove an MCP from the global registry. Does not affect `.awm.json` or any config files already written.

```bash
awm mcp unregister github
```

---

### `awm mcp import`

Scan the current directory for existing tool config files and register any MCP entries found into the global registry. Skips MCPs already in the registry.

Files scanned:

| File | Tool |
|------|------|
| `.mcp.json` | Claude Code |
| `.cursor/mcp.json` | Cursor |
| `.gemini/settings.json` | Gemini CLI |
| `.vscode/mcp.json` | GitHub Copilot |
| `~/.copilot/mcp-config.json` | Copilot CLI |
| `~/.codeium/windsurf/mcp_config.json` | Windsurf |

```bash
awm mcp import
```

```
[ok] Registered "fetch" from .mcp.json
     Skipping "memory" (already in registry)
     Import complete: 1 registered, 1 skipped.
```

---

### `awm mcp add [--dry-run]`

Select MCPs from the global registry to add to this workspace. After selection, AWM writes them to every tool config file listed in `.awm.json`.

Press **ESC** or **Ctrl+C** to cancel without making changes.

```bash
awm mcp add
```

```
? Select MCPs to add to this workspace: (Press <space> to select)
❯◯ fetch
 ◯ memory
 ◯ github

[ok] Wrote 2 MCP(s) to .mcp.json
[ok] Wrote 2 MCP(s) to .cursor/mcp.json
[ok] Added MCPs: fetch, memory
```

Use `--dry-run` to preview what would be written without touching any files.

---

### `awm mcp delete [--dry-run]`

Select MCPs to remove from this workspace. AWM re-applies the remaining MCPs to all tool config files (overwriting the MCP section).

Press **ESC** or **Ctrl+C** to cancel.

```bash
awm mcp delete
```

```
? Select MCPs to remove from this workspace: (Press <space> to select)
❯◉ fetch
 ◯ memory

[ok] Wrote 1 MCP(s) to .mcp.json
[ok] Removed MCPs: fetch
```

---

### `awm mcp list [-g]`

List MCPs in the current workspace. Add `-g` / `--global` to list the global registry instead.

```bash
awm mcp list        # workspace MCPs
awm mcp list -g     # all registry MCPs
```

```
Workspace MCPs:
  fetch
  memory
```

---

### `awm mcp show <id>`

Print the full stored definition for an MCP.

```bash
awm mcp show github
```

```json
{
  "id": "github",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
  }
}
```

---

## Skill Commands

Skills are stored as directories at `~/.agent-workspace/registry/skills/<name>/`. Each must contain a `SKILL.md` file.

### `awm skill register <name> --from <path>`

Register a skill from a local directory or a single `.md` file into the global registry.

```bash
# From a directory (must contain SKILL.md)
awm skill register clean-arch --from ./my-skills/clean-arch/

# From a single markdown file
awm skill register tdd-guide --from ./tdd.md
```

```
[ok] Skill "clean-arch" registered in global registry
```

---

### `awm skill unregister <name>`

Remove a skill from the global registry. Does not delete copies already written into projects.

```bash
awm skill unregister tdd-guide
```

---

### `awm skill import`

Scan the current directory for skill folders and register any found into the global registry. Directories scanned: `.claude/skills/`, `.agents/skills/`.

```bash
awm skill import
```

```
[ok] Registered "clean-arch" from .claude/skills
     Skipping "awm-cli" (already in registry)
     Import complete: 1 registered, 1 skipped.
```

---

### `awm skill add [--dry-run]`

Select skills from the global registry to add to this workspace. After selection, AWM copies them into every tool's skill directory listed in `.awm.json` (only tools that support skills, e.g. `claude-code`).

Press **ESC** or **Ctrl+C** to cancel.

```bash
awm skill add
```

```
? Select skills to add to this workspace: (Press <space> to select)
❯◯ awm-cli
 ◯ clean-arch

[ok] Copied skill "awm-cli" → .claude/skills/awm-cli
[ok] Added skills: awm-cli
```

---

### `awm skill delete`

Select skills to remove from this workspace. Updates `.awm.json` only — does not delete files from tool directories.

Press **ESC** or **Ctrl+C** to cancel.

```bash
awm skill delete
```

---

### `awm skill list [-g]`

List skills in the current workspace. Add `-g` / `--global` to list the global registry instead.

```bash
awm skill list      # workspace skills
awm skill list -g   # all registry skills
```

---

### `awm skill show <name>`

Print the `SKILL.md` content for a skill.

```bash
awm skill show awm-cli
```

---

## Tool Command

### `awm tool`

Open an interactive checkbox list of all known tools. Tools already selected for this workspace are pre-checked. Confirm to save the new tool list to `.awm.json` and resync all MCPs and skills to every selected tool.

Press **ESC** or **Ctrl+C** to cancel without changes.

```bash
awm tool
```

```
? Select tools for this workspace (space to toggle, enter to confirm):
❯◉ claude-code
 ◯ codex
 ◉ cursor
 ◯ gemini-cli
 ◯ github-copilot
 ◯ windsurf

Resyncing MCPs and skills to updated tool list...
[ok] Tools updated: claude-code, cursor
```

---

## Doctor Command

### `awm doctor`

Validate the registry and current workspace for consistency. Checks:

- Registry directories exist
- Every MCP JSON file in the registry is valid (`id`, `transport`, `command`)
- Every tool definition is structurally valid
- If `.awm.json` exists in the current directory:
  - Valid JSON with `tools`, `mcps`, `skills` arrays
  - All tool IDs are known
  - All MCP IDs exist in the registry
  - All skill names exist in the registry with a `SKILL.md`

```bash
awm doctor
```

**Clean output:**

```
[ok] No issues found
```

**Output when issues exist (exit code 1):**

```
[error] .awm.json: MCP "old-server" not found in registry
[error] .awm.json: skill "missing-skill" not found in registry
[error] MCP file "broken.json": MCP requires a string "command" field
```

Run `doctor` after manual registry edits or before sharing a project.

---

## Setup Command

### `awm setup [--force]`

Re-seed the registry with the default MCPs, skills, and tool definitions bundled with AWM. Already-present entries are skipped unless `--force` is passed.

```bash
awm setup           # skips existing entries
awm setup --force   # overwrites with fresh defaults
```

**Default MCPs seeded:**

| ID | Command | Notes |
|----|---------|-------|
| `github` | `npx -y @modelcontextprotocol/server-github` | Needs `GITHUB_TOKEN` env var |
| `filesystem` | `npx -y @modelcontextprotocol/server-filesystem` | Local file access |
| `memory` | `npx -y @modelcontextprotocol/server-memory` | Persistent knowledge graph |
| `fetch` | `uvx mcp-server-fetch` | Web fetching (requires `uv`) |

---

## Pull Command

### `awm pull [type] [--tool <id>] [--force] [--dry-run]`

Read each AI tool's **global config files** and register any MCPs or skills found there into the global AWM registry. This is the fastest way to populate the registry from tools you already have configured (e.g. MCPs in `~/.claude.json`, skills in `~/.claude/skills/`).

After pulling, use `awm mcp add` / `awm skill add` to activate entries in a workspace.

```bash
awm pull              # pull both skills and MCPs from all tools
awm pull skills       # pull skills only
awm pull mcps         # pull MCPs only
awm pull --tool claude-code   # scope to one tool
awm pull --force              # overwrite existing registry entries
awm pull --dry-run            # preview without making changes
```

**Example — dry-run across all tools:**

```
[dry-run] Would register MCP "pencil" from claude-code
[dry-run] Would register skill "clean-arch" from claude-code
  [skill] Skipping "awm-cli" (already registered)
[dry-run] Would register MCP "pencil" from codex
MCPs: 2 pulled, 1 skipped | Skills: 1 pulled, 1 skipped
```

**Options:**

| Option | Description |
|--------|-------------|
| `[type]` | `skills` or `mcps`. Omit to pull both. |
| `--tool <id>` | Limit to a single tool ID (e.g. `claude-code`, `cursor`). |
| `--force` | Overwrite entries that already exist in the registry. |
| `--dry-run` | Show what would be imported without writing anything. |

**What gets scanned:**

| Tool | Global MCP file | Global skills folder |
|------|----------------|---------------------|
| `claude-code` | `~/.claude.json` | `~/.claude/skills/` |
| `codex` | `~/.codex/config.toml` | `~/.agents/skills/` |
| `cursor` | `~/.cursor/mcp.json` | `~/.cursor/rules/` |
| `gemini-cli` | global settings file | global skills folder |
| `windsurf` | global MCP config | — |
| `copilot-cli` | global MCP config | — |
| `github-copilot` | — (no global MCP) | — |

Skills must be directories containing a `SKILL.md` file to be picked up. MCP entries without a `command` field are skipped.

---

## Sync Command

### `awm sync [--dry-run]`

Re-apply all MCPs and skills listed in `.awm.json` to every tool config file. Use this after manually editing `.awm.json` to bring tool configs back in sync without going through `mcp add` or `skill add`.

```bash
awm sync            # apply .awm.json to all tool configs
awm sync --dry-run  # preview what would be written
```

```
[ok] Wrote 2 MCP(s) to .mcp.json
[ok] Wrote 2 MCP(s) to .cursor/mcp.json
[ok] Copied skill "awm-cli" → .claude/skills/awm-cli
[ok] Workspace synced.
```

---

## Workspace Config (.awm.json)

Created by `awm init` at the project root. Managed automatically by AWM — you can edit it manually and run `awm sync` to re-apply, or `awm doctor` to validate.

```json
{
  "tools": ["claude-code", "cursor"],
  "mcps": ["fetch", "memory"],
  "skills": ["awm-cli"],
  "lastSync": "2026-03-08T12:00:00Z"
}
```

| Field | Description |
|-------|-------------|
| `tools` | AI tools to write configs for in this project |
| `mcps` | MCP IDs from the global registry active in this project |
| `skills` | Skill names from the global registry active in this project |
| `lastSync` | Timestamp of the last apply (set automatically) |

---

## Registry Layout

```
~/.agent-workspace/
  registry/
    mcps/
      github.json
      fetch.json
      memory.json

    skills/
      awm-cli/
        SKILL.md
      clean-arch/
        SKILL.md

    tools/              ← user overrides (optional)
      my-custom-tool.json
```

The built-in tool definitions are bundled with the CLI. The `tools/` directory in the registry is for **user-defined overrides** — AWM checks it first.

---

## MCP Definition Format

```json
{
  "id": "my-server",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "MY_TOKEN": "${env:MY_TOKEN}"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique registry slug. Used as the key in generated config files. |
| `transport` | Yes | `stdio`, `sse`, or `http` |
| `command` | Yes | Executable to run |
| `args` | No | Array of arguments |
| `env` | No | Env vars to pass. `${env:VAR}` values are written verbatim — the target tool resolves them at runtime. |

---

## Supported Tools

| Tool ID | Name | MCP format | Skills | Project MCP file |
|---------|------|-----------|--------|-----------------|
| `claude-code` | Claude Code | JSON | Yes | `.mcp.json` |
| `codex` | Codex | TOML | No | `.codex/config.toml` |
| `cursor` | Cursor | JSON | No | `.cursor/mcp.json` |
| `gemini-cli` | Gemini CLI | JSON | No | `.gemini/settings.json` |
| `github-copilot` | GitHub Copilot | JSON | No | `.vscode/mcp.json` |
| `windsurf` | Windsurf | JSON | No | — (global only) |
| `copilot-cli` | Copilot CLI | JSON | No | — (global only) |

Notes:
- **claude-code** is the only tool that supports skills.
- **windsurf** and **copilot-cli** are global-scope only; workspace apply skips them for project-scoped config files.
- **github-copilot** uses `servers` as the root key (not `mcpServers`).
- **codex** uses TOML with `mcp_servers` as the root key.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWM_REGISTRY` | `~/.agent-workspace/registry` | Override the registry root. Useful for testing or team shared registries. |

```bash
# Isolated registry for testing
AWM_REGISTRY=./test-registry awm mcp list -g

# Shared team registry
AWM_REGISTRY=/mnt/shared/awm-registry awm mcp list -g
```

---

## Adding a Custom Tool

Create a JSON file in `~/.agent-workspace/registry/tools/` named `<id>.json`. AWM will use it in place of any built-in definition with the same ID, or add it as a new tool.

**Example: `~/.agent-workspace/registry/tools/my-tool.json`**

```json
{
  "id": "my-tool",
  "name": "My Custom AI Tool",
  "supports": {
    "mcp": true,
    "skills": false
  },
  "mcp": {
    "format": "json",
    "project": {
      "targetFile": ".my-tool/mcp.json",
      "rootObject": "mcpServers"
    }
  }
}
```

After saving, the tool is immediately available:

```bash
awm tool          # my-tool appears in the checkbox list
```

**Supported MCP formats:**
- `"format": "json"` — writes a JSON file
- `"format": "toml"` — writes a TOML file (e.g. like Codex)
