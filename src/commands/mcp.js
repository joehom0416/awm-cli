import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { listMcps, getMcp, saveMcp, removeMcp } from '../registry/mcpRegistry.js';
import { requireWorkspace, writeWorkspace } from '../workspace/workspaceConfig.js';
import { applyAll } from '../workspace/applyWorkspace.js';
import { resolvePath } from '../utils/pathResolver.js';
import { readJson } from '../utils/fileUtils.js';

// Tool config files to scan for 'mcp import'
const SCAN_TARGETS = [
  '.mcp.json',
  '.cursor/mcp.json',
  '.gemini/settings.json',
  '.vscode/mcp.json',
];

const GLOBAL_SCAN_TARGETS = [
  '~/.copilot/mcp-config.json',
  '~/.codeium/windsurf/mcp_config.json',
];

/** Returns false if the user cancelled (ESC / Ctrl+C), rethrows other errors. */
async function prompt(questions) {
  try {
    return await inquirer.prompt(questions);
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      log.info('Cancelled.');
      return null;
    }
    throw err;
  }
}

/**
 * Extract MCP entries from a parsed JSON config object.
 * Tries common root keys: mcpServers, servers
 */
function extractMcpsFromJson(data) {
  const block = data?.mcpServers ?? data?.servers ?? {};
  const results = [];
  for (const [id, def] of Object.entries(block)) {
    if (!def.command) continue;
    results.push({
      id,
      transport: 'stdio',
      command: def.command,
      ...(def.args ? { args: def.args } : {}),
      ...(def.env ? { env: def.env } : {}),
    });
  }
  return results;
}

export function makeMcpCommand() {
  const mcp = new Command('mcp').description('Manage MCP server definitions');

  // register — save to global registry
  mcp
    .command('register [id]')
    .description('Interactively register an MCP server in the global registry')
    .action(async (idArg) => {
      const questions = [];
      if (!idArg) {
        questions.push({ type: 'input', name: 'id', message: 'MCP ID (unique slug):', validate: v => !!v || 'Required' });
      }
      questions.push(
        { type: 'list', name: 'transport', message: 'Transport:', choices: ['stdio', 'sse', 'http'] },
        { type: 'input', name: 'command', message: 'Command:', validate: v => !!v || 'Required' },
        { type: 'input', name: 'args', message: 'Args (space-separated, optional):' },
        { type: 'input', name: 'env', message: 'Env vars (KEY=VALUE pairs, space-separated, optional):' },
      );
      const answers = await inquirer.prompt(questions);
      if (idArg) answers.id = idArg;

      const mcpDef = {
        id: answers.id,
        transport: answers.transport,
        command: answers.command,
      };
      if (answers.args?.trim()) {
        mcpDef.args = answers.args.trim().split(/\s+/);
      }
      if (answers.env?.trim()) {
        mcpDef.env = {};
        for (const pair of answers.env.trim().split(/\s+/)) {
          const idx = pair.indexOf('=');
          if (idx > 0) mcpDef.env[pair.slice(0, idx)] = pair.slice(idx + 1);
        }
      }

      saveMcp(mcpDef);
      log.success(`MCP "${mcpDef.id}" registered in global registry`);
    });

  // unregister — remove from global registry
  mcp
    .command('unregister <id>')
    .description('Remove an MCP from the global registry')
    .action((id) => {
      removeMcp(id);
      log.success(`MCP "${id}" removed from registry`);
    });

  // import — scan current dir tool configs and register MCPs found
  mcp
    .command('import')
    .description('Scan cwd tool config files and import MCPs into the global registry')
    .action(() => {
      const allTargets = [
        ...SCAN_TARGETS.map(f => path.join(process.cwd(), f)),
        ...GLOBAL_SCAN_TARGETS.map(f => resolvePath(f)),
      ];

      let imported = 0;
      let skipped = 0;

      for (const filePath of allTargets) {
        if (!fs.existsSync(filePath)) continue;
        const data = readJson(filePath);
        if (!data) continue;

        const entries = extractMcpsFromJson(data);
        for (const entry of entries) {
          if (getMcp(entry.id)) {
            log.info(`  Skipping "${entry.id}" (already in registry)`);
            skipped++;
          } else {
            try {
              saveMcp(entry);
              log.success(`  Registered "${entry.id}" from ${path.basename(filePath)}`);
              imported++;
            } catch (e) {
              log.warn(`  Could not register "${entry.id}": ${e.message}`);
            }
          }
        }
      }

      if (imported === 0 && skipped === 0) {
        log.info('No MCP entries found in tool config files.');
      } else {
        log.info(`Import complete: ${imported} registered, ${skipped} skipped.`);
      }
    });

  // add — select from registry, add to .awm.json, apply
  mcp
    .command('add')
    .description('Add MCPs from the registry to this workspace and apply to all tools')
    .option('--dry-run', 'Preview what would be written without making changes')
    .action(async (opts) => {
      const ws = requireWorkspace();
      const allIds = listMcps();

      if (allIds.length === 0) {
        log.info('No MCPs in registry. Run "awm mcp register" to add one.');
        return;
      }

      const available = allIds.filter(id => !ws.mcps.includes(id));
      if (available.length === 0) {
        log.info('All registry MCPs are already in this workspace.');
        return;
      }

      const answer = await prompt([{
        type: 'checkbox',
        name: 'chosen',
        message: 'Select MCPs to add to this workspace:',
        choices: available,
        validate: v => v.length > 0 || 'Select at least one MCP',
      }]);
      if (!answer) return;

      const updated = { ...ws, mcps: [...ws.mcps, ...answer.chosen] };
      writeWorkspace(updated);
      await applyAll(updated, opts.dryRun);
      if (!opts.dryRun) {
        log.success(`Added MCPs: ${answer.chosen.join(', ')}`);
      }
    });

  // delete — select from workspace list, remove from .awm.json, re-apply
  mcp
    .command('delete')
    .description('Select MCPs to remove from this workspace and re-apply all tools')
    .option('--dry-run', 'Preview what would be written without making changes')
    .action(async (opts) => {
      const ws = requireWorkspace();
      if (!ws.mcps.length) {
        log.info('No MCPs in this workspace to remove.');
        return;
      }

      const answer = await prompt([{
        type: 'checkbox',
        name: 'chosen',
        message: 'Select MCPs to remove from this workspace:',
        choices: ws.mcps,
        validate: v => v.length > 0 || 'Select at least one MCP',
      }]);
      if (!answer) return;

      const updated = { ...ws, mcps: ws.mcps.filter(m => !answer.chosen.includes(m)) };
      writeWorkspace(updated);
      await applyAll(updated, opts.dryRun);
      if (!opts.dryRun) {
        log.success(`Removed MCPs: ${answer.chosen.join(', ')}`);
      }
    });

  // list — project workspace or global registry
  mcp
    .command('list')
    .description('List MCPs in this workspace; use -g to list the global registry')
    .option('-g, --global', 'List all MCPs in the global registry instead')
    .action((opts) => {
      if (opts.global) {
        const ids = listMcps();
        log.info('Global registry MCPs:');
        if (ids.length === 0) {
          log.info('  (none)');
        } else {
          ids.forEach(id => log.info(`  ${id}`));
        }
        return;
      }

      const ws = requireWorkspace();
      log.info('Workspace MCPs:');
      if (ws.mcps?.length) {
        ws.mcps.forEach(id => log.info(`  ${id}`));
      } else {
        log.info('  (none)');
      }
    });

  // show — unchanged
  mcp
    .command('show <id>')
    .description('Show details of a registered MCP')
    .action((id) => {
      const def = getMcp(id);
      if (!def) throw new Error(`MCP "${id}" not found`);
      log.info(JSON.stringify(def, null, 2));
    });

  return mcp;
}
