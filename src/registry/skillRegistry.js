import fs from 'node:fs';
import path from 'node:path';
import { getSkillsDir } from './paths.js';
import { listDirs, fileExists, copyDir } from '../utils/fileUtils.js';

function skillDir(name) {
  return path.join(getSkillsDir(), name);
}

/**
 * List all registered skill names.
 * @returns {string[]}
 */
export function listSkills() {
  return listDirs(getSkillsDir());
}

/**
 * Add a skill from a source path (directory or single .md file).
 * If src is a directory, it is copied as-is.
 * If src is a .md file, it is placed into a new folder named after the skill,
 * saved as SKILL.md.
 * @param {string} name
 * @param {string} src  absolute path to source
 */
export async function addSkill(name, src) {
  const dest = skillDir(name);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    await copyDir(src, dest);
  } else if (src.endsWith('.md')) {
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(src, path.join(dest, 'SKILL.md'));
  } else {
    throw new Error(`Skill source must be a directory or .md file: ${src}`);
  }
}

/**
 * Show the SKILL.md contents for a skill.
 * Returns null if SKILL.md doesn't exist.
 * @param {string} name
 * @returns {string|null}
 */
export function showSkill(name) {
  const skillMd = path.join(skillDir(name), 'SKILL.md');
  if (!fileExists(skillMd)) return null;
  return fs.readFileSync(skillMd, 'utf8');
}

/**
 * Remove a skill by name. Throws if not found.
 * @param {string} name
 */
export function removeSkill(name) {
  const dir = skillDir(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Skill "${name}" not found in registry`);
  }
  fs.rmSync(dir, { recursive: true });
}
