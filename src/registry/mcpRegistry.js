import fs from 'node:fs';
import path from 'node:path';
import { getMcpsDir } from './paths.js';
import { readJson, writeJson, listFiles } from '../utils/fileUtils.js';
import { validateMcp } from '../utils/validator.js';

function mcpFile(id) {
  return path.join(getMcpsDir(), `${id}.json`);
}

/**
 * List all registered MCP IDs.
 * @returns {string[]}
 */
export function listMcps() {
  return listFiles(getMcpsDir())
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));
}

/**
 * Get an MCP definition by ID. Returns null if not found.
 * @param {string} id
 * @returns {object|null}
 */
export function getMcp(id) {
  return readJson(mcpFile(id));
}

/**
 * Save an MCP definition (validates first).
 * Throws if validation fails.
 * @param {object} mcp
 */
export function saveMcp(mcp) {
  const { valid, errors } = validateMcp(mcp);
  if (!valid) {
    throw new Error(`Invalid MCP definition: ${errors.join('; ')}`);
  }
  writeJson(mcpFile(mcp.id), mcp);
}

/**
 * Remove an MCP by ID. Throws if not found.
 * @param {string} id
 */
export function removeMcp(id) {
  const file = mcpFile(id);
  if (!fs.existsSync(file)) {
    throw new Error(`MCP "${id}" not found in registry`);
  }
  fs.rmSync(file);
}

/**
 * Import one or more MCPs from a JSON value (single object or array).
 * @param {object|object[]} data
 * @returns {string[]} imported IDs
 */
export function importMcps(data) {
  const items = Array.isArray(data) ? data : [data];
  const imported = [];
  for (const item of items) {
    saveMcp(item);
    imported.push(item.id);
  }
  return imported;
}
