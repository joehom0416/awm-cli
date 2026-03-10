import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { requireWorkspace } from '../workspace/workspaceConfig.js';
import { applyAll } from '../workspace/applyWorkspace.js';

export function makeSyncCommand() {
  const cmd = new Command('sync');

  cmd
    .description('Re-apply MCPs and skills from .awm.json to all tool config files')
    .option('--dry-run', 'Show what would be written without making changes')
    .action(async (opts) => {
      const ws = requireWorkspace();
      await applyAll(ws, opts.dryRun);
      if (!opts.dryRun) {
        log.success('Workspace synced.');
      }
    });

  return cmd;
}
