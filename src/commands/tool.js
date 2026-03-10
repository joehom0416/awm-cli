import { Command } from 'commander';
import inquirer from 'inquirer';
import { log } from '../utils/logger.js';
import { listTools } from '../registry/toolRegistry.js';
import { readWorkspace, writeWorkspace } from '../workspace/workspaceConfig.js';
import { applyAll } from '../workspace/applyWorkspace.js';

export function makeToolCommand() {
  return new Command('tool')
    .description('Select which tools this workspace targets, then resync MCPs and skills')
    .action(async () => {
      const allTools = listTools();
      if (allTools.length === 0) throw new Error('No tool definitions found');

      const ws = readWorkspace();
      const currentTools = ws?.tools ?? [];

      let answer;
      try {
        answer = await inquirer.prompt([{
          type: 'checkbox',
          name: 'tools',
          message: 'Select tools for this workspace (space to toggle, enter to confirm):',
          choices: allTools.map(id => ({ name: id, value: id, checked: currentTools.includes(id) })),
          validate: v => v.length > 0 || 'Select at least one tool',
        }]);
      } catch (err) {
        if (err.name === 'ExitPromptError') {
          log.info('Cancelled.');
          return;
        }
        throw err;
      }

      const updated = { ...(ws ?? { mcps: [], skills: [] }), tools: answer.tools };
      writeWorkspace(updated);

      if (updated.mcps.length > 0 || updated.skills.length > 0) {
        log.info('Resyncing MCPs and skills to updated tool list...');
        await applyAll(updated);
      }

      log.success(`Tools updated: ${answer.tools.join(', ')}`);
    });
}
