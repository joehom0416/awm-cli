import path from 'node:path';
import { readJson, writeJson } from '../utils/fileUtils.js';

export function getWorkspacePath() {
  return path.join(process.cwd(), '.awm.json');
}

/**
 * Read .awm.json from cwd. Returns null if not found.
 * @returns {object|null}
 */
export function readWorkspace() {
  return readJson(getWorkspacePath());
}

/**
 * Write .awm.json to cwd, updating lastSync timestamp.
 * @param {object} ws
 */
export function writeWorkspace(ws) {
  writeJson(getWorkspacePath(), { ...ws, lastSync: new Date().toISOString() });
}

/**
 * Read .awm.json or throw a helpful error if missing.
 * @returns {object}
 */
export function requireWorkspace() {
  const ws = readWorkspace();
  if (!ws) {
    throw new Error('No .awm.json found in current directory. Run "awm init" first.');
  }
  return ws;
}
