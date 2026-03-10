import fs from 'node:fs';
import path from 'node:path';
import { getRegistryRoot } from '../utils/pathResolver.js';

export function getMcpsDir() {
  return path.join(getRegistryRoot(), 'mcps');
}

export function getSkillsDir() {
  return path.join(getRegistryRoot(), 'skills');
}

export function getToolsDir() {
  return path.join(getRegistryRoot(), 'tools');
}

export function ensureRegistryDirs() {
  for (const dir of [getMcpsDir(), getSkillsDir(), getToolsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
