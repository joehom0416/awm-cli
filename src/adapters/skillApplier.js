import path from 'node:path';
import { getSkillsDir } from '../registry/paths.js';
import { fileExists, copyDir } from '../utils/fileUtils.js';
import { resolvePath } from '../utils/pathResolver.js';
import { log } from '../utils/logger.js';

/**
 * Apply skills to a target folder.
 * For each skill: validates SKILL.md exists, then copies the skill directory.
 * @param {string[]} skillNames
 * @param {string} targetFolder  may contain ~ or env vars
 * @param {boolean} dryRun
 */
export async function applySkills(skillNames, targetFolder, dryRun = false) {
  const resolvedTarget = resolvePath(targetFolder);

  for (const name of skillNames) {
    const skillDir = path.join(getSkillsDir(), name);
    const skillMd = path.join(skillDir, 'SKILL.md');

    if (!fileExists(skillMd)) {
      throw new Error(`Skill "${name}" is missing SKILL.md at ${skillMd}`);
    }

    const dest = path.join(resolvedTarget, name);

    if (dryRun) {
      log.dryRun(`Would copy skill "${name}" → ${dest}`);
      continue;
    }

    await copyDir(skillDir, dest);
    log.success(`Copied skill "${name}" → ${dest}`);
  }
}
