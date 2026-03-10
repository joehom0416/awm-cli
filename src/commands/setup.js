import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { runSeed } from '../seed.js';

export function makeSetupCommand() {
  return new Command('setup')
    .description('Seed the registry with default MCPs and skills')
    .option('--force', 'Overwrite existing defaults with fresh copies')
    .action((opts) => {
      const force = !!opts.force;
      const results = runSeed(force);

      if (results.tools.length > 0) {
        log.success(`Seeded tools: ${results.tools.join(', ')}`);
      }
      if (results.mcps.length > 0) {
        log.success(`Seeded MCPs: ${results.mcps.join(', ')}`);
      }
      if (results.skills.length > 0) {
        log.success(`Seeded skills: ${results.skills.join(', ')}`);
      }
      if (results.skipped.length > 0) {
        log.info(`Skipped (already present): ${results.skipped.join(', ')}`);
        log.info('Use --force to overwrite existing defaults.');
      }
      const seeded = results.tools.length + results.mcps.length + results.skills.length;
      if (seeded === 0 && results.skipped.length === 0) {
        log.info('Nothing to seed.');
      }
    });
}
