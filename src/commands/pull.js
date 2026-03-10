import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import { log } from '../utils/logger.js';
import { resolvePath } from '../utils/pathResolver.js';
import { readJson } from '../utils/fileUtils.js';
import { listTools, loadTool } from '../registry/toolRegistry.js';
import { getMcp, saveMcp } from '../registry/mcpRegistry.js';
import { listSkills, addSkill } from '../registry/skillRegistry.js';

/**
 * Extract MCPs from a tool's global config file.
 * @param {object} tool
 * @returns {{id: string, transport: string, command: string, args?: string[], env?: object}[]}
 */
function extractMcpsFromTool(tool) {
  if (!tool.mcp?.global) return [];

  const resolvedPath = resolvePath(tool.mcp.global.targetFile);
  if (!fs.existsSync(resolvedPath)) return [];

  let data;
  if (tool.mcp.format === 'toml') {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      data = TOML.parse(raw);
    } catch (e) {
      log.warn(`Could not parse TOML at ${resolvedPath}: ${e.message}`);
      return [];
    }
  } else {
    data = readJson(resolvedPath);
    if (!data) return [];
  }

  const entries = data[tool.mcp.global.rootObject] ?? {};
  const results = [];

  for (const [id, def] of Object.entries(entries)) {
    if (!def.command) continue;
    const entry = { id, transport: 'stdio', command: def.command };
    if (def.args) entry.args = def.args;
    if (def.env) entry.env = def.env;
    results.push(entry);
  }

  return results;
}

/**
 * Extract skills from a tool's global skills folder.
 * @param {object} tool
 * @returns {{name: string, srcPath: string}[]}
 */
function extractSkillsFromTool(tool) {
  if (!tool.skills?.global) return [];

  const folderPath = resolvePath(tool.skills.global.targetFolder);
  if (!fs.existsSync(folderPath)) return [];

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(folderPath, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    results.push({ name: entry.name, srcPath: path.join(folderPath, entry.name) });
  }

  return results;
}

export function makePullCommand() {
  const cmd = new Command('pull');

  cmd
    .description('Pull skills and MCPs from global tool config files into the AWM registry')
    .argument('[type]', 'What to pull: "skills" or "mcps" (default: both)')
    .option('--tool <id>', 'Scope to a specific tool ID')
    .option('--force', 'Overwrite existing registry entries')
    .option('--dry-run', 'Show what would be imported without making changes')
    .action(async (type, opts) => {
      // Phase A — Resolve tool list
      const toolIds = opts.tool ? [opts.tool] : listTools();

      if (opts.tool) {
        const check = loadTool(opts.tool);
        if (!check) {
          log.error(`Unknown tool: "${opts.tool}"`);
          process.exit(1);
        }
      }

      // Phase B — Determine what to pull
      const pullMcps   = !type || type === 'mcps';
      const pullSkills = !type || type === 'skills';

      if (!pullMcps && !pullSkills) {
        log.error(`Unknown type: "${type}". Use "skills" or "mcps".`);
        process.exit(1);
      }

      let mcpPulled = 0, mcpSkipped = 0;
      let skillPulled = 0, skillSkipped = 0;

      // Phase C — Per-tool loop
      for (const id of toolIds) {
        const tool = loadTool(id);
        if (!tool) continue;

        if (pullMcps) {
          for (const entry of extractMcpsFromTool(tool)) {
            const exists = getMcp(entry.id) !== null;
            if (exists && !opts.force) {
              log.info(`  [mcp] Skipping "${entry.id}" (already registered)`);
              mcpSkipped++;
              continue;
            }
            if (opts.dryRun) {
              log.dryRun(`Would register MCP "${entry.id}" from ${id}`);
              continue;
            }
            try {
              saveMcp(entry);
              log.success(`  [mcp] Registered "${entry.id}" from ${id}`);
              mcpPulled++;
            } catch (e) {
              log.warn(`  [mcp] Could not register "${entry.id}": ${e.message}`);
            }
          }
        }

        if (pullSkills) {
          for (const entry of extractSkillsFromTool(tool)) {
            const exists = listSkills().includes(entry.name);
            if (exists && !opts.force) {
              log.info(`  [skill] Skipping "${entry.name}" (already registered)`);
              skillSkipped++;
              continue;
            }
            if (opts.dryRun) {
              log.dryRun(`Would register skill "${entry.name}" from ${id}`);
              continue;
            }
            try {
              await addSkill(entry.name, entry.srcPath);
              log.success(`  [skill] Registered "${entry.name}" from ${id}`);
              skillPulled++;
            } catch (e) {
              log.warn(`  [skill] Could not register "${entry.name}": ${e.message}`);
            }
          }
        }
      }

      // Phase D — Summary
      if (!opts.dryRun) {
        const parts = [];
        if (pullMcps)   parts.push(`MCPs: ${mcpPulled} pulled, ${mcpSkipped} skipped`);
        if (pullSkills) parts.push(`Skills: ${skillPulled} pulled, ${skillSkipped} skipped`);
        log.info(parts.join(' | '));
      }
    });

  return cmd;
}
