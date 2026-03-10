import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'node:fs';
import { log } from '../utils/logger.js';
import { listTools } from '../registry/toolRegistry.js';
import { getWorkspacePath, writeWorkspace } from '../workspace/workspaceConfig.js';

export function makeInitCommand() {
  return new Command('init')
    .description('Initialize a workspace config (.awm.json) in the current directory')
    .option('--force', 'Overwrite existing .awm.json')
    .action(async (opts) => {
      const wsPath = getWorkspacePath();

      if (fs.existsSync(wsPath) && !opts.force) {
        throw new Error(`.awm.json already exists. Use --force to overwrite.`);
      }

      const tools = listTools();
      if (tools.length === 0) throw new Error('No tool definitions found');

      const { selectedTools } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selectedTools',
        message: 'Select tools to support in this workspace:',
        choices: tools,
        validate: v => v.length > 0 || 'Select at least one tool',
      }]);

      writeWorkspace({ tools: selectedTools, mcps: [], skills: [] });
      log.success(`Workspace initialized with tools: ${selectedTools.join(', ')}`);
      log.info(`  Run "awm mcp add" to add MCPs, "awm skill add" to add skills.`);
    });
}
