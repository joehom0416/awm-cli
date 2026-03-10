import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { requireWorkspace } from '../workspace/workspaceConfig.js';

export function makeStatusCommand() {
  return new Command('status')
    .description('Show current workspace state (.awm.json)')
    .action(() => {
      const ws = requireWorkspace();

      log.info('Workspace status:');
      log.info(`  Tools:    ${ws.tools?.length ? ws.tools.join(', ') : '(none)'}`);
      log.info(`  MCPs:     ${ws.mcps?.length ? ws.mcps.join(', ') : '(none)'}`);
      log.info(`  Skills:   ${ws.skills?.length ? ws.skills.join(', ') : '(none)'}`);
      log.info(`  lastSync: ${ws.lastSync ?? '(never)'}`);
    });
}
