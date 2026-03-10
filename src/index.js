import { Command } from 'commander';
import { ensureRegistryDirs } from './registry/paths.js';
import { log } from './utils/logger.js';
import { makeMcpCommand } from './commands/mcp.js';
import { makeSkillCommand } from './commands/skill.js';
import { makeInitCommand } from './commands/init.js';
import { makePullCommand } from './commands/pull.js';
import { makeStatusCommand } from './commands/status.js';
import { makeDoctorCommand } from './commands/doctor.js';
import { makeToolCommand } from './commands/tool.js';
import { makeSetupCommand } from './commands/setup.js';
import { makeSyncCommand } from './commands/sync.js';

const program = new Command();

program
  .name('awm')
  .description('Agent Workspace Manager — manage MCP servers, skills, and workspace configs for AI coding tools')
  .version('1.0.0');

program.addCommand(makeInitCommand());
program.addCommand(makePullCommand());
program.addCommand(makeStatusCommand());
program.addCommand(makeMcpCommand());
program.addCommand(makeSkillCommand());
program.addCommand(makeDoctorCommand());
program.addCommand(makeToolCommand());
program.addCommand(makeSetupCommand());
program.addCommand(makeSyncCommand());

try {
  ensureRegistryDirs();
  await program.parseAsync(process.argv);
} catch (err) {
  log.error(err.message);
  process.exit(1);
}
