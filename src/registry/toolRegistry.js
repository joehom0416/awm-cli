import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToolsDir } from './paths.js';
import { readJson, listFiles } from '../utils/fileUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_TOOLS_DIR = path.join(__dirname, '..', 'tools');

/**
 * Load a tool definition by ID.
 * Checks user registry tools/ first, then falls back to builtin src/tools/.
 * Returns null if not found.
 * @param {string} id
 * @returns {object|null}
 */
export function loadTool(id) {
  // User override
  const userFile = path.join(getToolsDir(), `${id}.json`);
  if (fs.existsSync(userFile)) return readJson(userFile);

  // Builtin
  const builtinFile = path.join(BUILTIN_TOOLS_DIR, `${id}.json`);
  if (fs.existsSync(builtinFile)) return readJson(builtinFile);

  return null;
}

/**
 * List all known tool IDs (union of user overrides and builtins).
 * @returns {string[]}
 */
export function listTools() {
  const userTools = listFiles(getToolsDir())
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));

  const builtinTools = listFiles(BUILTIN_TOOLS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));

  return [...new Set([...userTools, ...builtinTools])];
}
