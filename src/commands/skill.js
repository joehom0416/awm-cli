import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { listSkills, addSkill, showSkill, removeSkill } from '../registry/skillRegistry.js';
import { requireWorkspace, writeWorkspace } from '../workspace/workspaceConfig.js';
import { applyAll } from '../workspace/applyWorkspace.js';

/** Returns null if the user cancelled (ESC / Ctrl+C), rethrows other errors. */
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

// Directories to scan for 'skill import'
const SKILL_SCAN_DIRS = [
  '.claude/skills',
  '.agents/skills',
];

export function makeSkillCommand() {
  const skill = new Command('skill').description('Manage skills');

  // register — copy into global registry
  skill
    .command('register <name>')
    .description('Register a skill from a directory or .md file into the global registry')
    .requiredOption('--from <path>', 'Source directory or .md file')
    .action(async (name, opts) => {
      const src = path.resolve(opts.from);
      await addSkill(name, src);
      log.success(`Skill "${name}" registered in global registry`);
    });

  // unregister — remove from global registry
  skill
    .command('unregister <name>')
    .description('Remove a skill from the global registry')
    .action((name) => {
      removeSkill(name);
      log.success(`Skill "${name}" removed from registry`);
    });

  // import — scan cwd skill dirs and register found skills
  skill
    .command('import')
    .description('Scan cwd skill directories and import skills into the global registry')
    .action(async () => {
      let imported = 0;
      let skipped = 0;

      for (const relDir of SKILL_SCAN_DIRS) {
        const scanDir = path.join(process.cwd(), relDir);
        if (!fs.existsSync(scanDir)) continue;

        for (const entry of fs.readdirSync(scanDir)) {
          const skillPath = path.join(scanDir, entry);
          if (!fs.statSync(skillPath).isDirectory()) continue;
          const skillMd = path.join(skillPath, 'SKILL.md');
          if (!fs.existsSync(skillMd)) continue;

          if (listSkills().includes(entry)) {
            log.info(`  Skipping "${entry}" (already in registry)`);
            skipped++;
          } else {
            await addSkill(entry, skillPath);
            log.success(`  Registered "${entry}" from ${relDir}`);
            imported++;
          }
        }
      }

      if (imported === 0 && skipped === 0) {
        log.info('No skill directories found to import.');
      } else {
        log.info(`Import complete: ${imported} registered, ${skipped} skipped.`);
      }
    });

  // add — select from registry, add to .awm.json, apply
  skill
    .command('add')
    .description('Add skills from the registry to this workspace and apply to all tools')
    .option('--dry-run', 'Preview what would be written without making changes')
    .action(async (opts) => {
      const ws = requireWorkspace();
      const allNames = listSkills();

      if (allNames.length === 0) {
        log.info('No skills in registry. Run "awm skill register --from <path>" to add one.');
        return;
      }

      const available = allNames.filter(n => !ws.skills.includes(n));
      if (available.length === 0) {
        log.info('All registry skills are already in this workspace.');
        return;
      }

      const answer = await prompt([{
        type: 'checkbox',
        name: 'chosen',
        message: 'Select skills to add to this workspace:',
        choices: available,
        validate: v => v.length > 0 || 'Select at least one skill',
      }]);
      if (!answer) return;

      const updated = { ...ws, skills: [...ws.skills, ...answer.chosen] };
      writeWorkspace(updated);
      await applyAll(updated, opts.dryRun);
      if (!opts.dryRun) {
        log.success(`Added skills: ${answer.chosen.join(', ')}`);
      }
    });

  // delete — select from workspace list, remove from .awm.json (no file deletion)
  skill
    .command('delete')
    .description('Select skills to remove from this workspace (does not delete files from tool dirs)')
    .action(async () => {
      const ws = requireWorkspace();
      if (!ws.skills.length) {
        log.info('No skills in this workspace to remove.');
        return;
      }

      const answer = await prompt([{
        type: 'checkbox',
        name: 'chosen',
        message: 'Select skills to remove from this workspace:',
        choices: ws.skills,
        validate: v => v.length > 0 || 'Select at least one skill',
      }]);
      if (!answer) return;

      const updated = { ...ws, skills: ws.skills.filter(s => !answer.chosen.includes(s)) };
      writeWorkspace(updated);
      log.success(`Removed skills: ${answer.chosen.join(', ')}`);
    });

  // list — project workspace or global registry
  skill
    .command('list')
    .description('List skills in this workspace; use -g to list the global registry')
    .option('-g, --global', 'List all skills in the global registry instead')
    .action((opts) => {
      if (opts.global) {
        const names = listSkills();
        log.info('Global registry skills:');
        if (names.length === 0) {
          log.info('  (none)');
        } else {
          names.forEach(n => log.info(`  ${n}`));
        }
        return;
      }

      const ws = requireWorkspace();
      log.info('Workspace skills:');
      if (ws.skills?.length) {
        ws.skills.forEach(n => log.info(`  ${n}`));
      } else {
        log.info('  (none)');
      }
    });

  // show — unchanged
  skill
    .command('show <name>')
    .description('Show SKILL.md for a registered skill')
    .action((name) => {
      const content = showSkill(name);
      if (content === null) throw new Error(`Skill "${name}" not found or missing SKILL.md`);
      log.info(content);
    });

  return skill;
}
