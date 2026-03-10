import fs from 'node:fs';
import path from 'node:path';
import TOML from '@iarna/toml';
import { fileExists } from '../utils/fileUtils.js';
import { resolvePath } from '../utils/pathResolver.js';
import { log } from '../utils/logger.js';
import { buildMcpBlock } from './jsonAdapter.js';

/**
 * Apply MCPs to a TOML config file (merge-safe).
 * Reads existing file, merges into [rootObject] key, writes back (or dry-runs).
 * @param {string} targetFile  may contain ~ or env vars
 * @param {string} rootObject  e.g. "mcpServers"
 * @param {object[]} mcps      canonical MCP definitions
 * @param {boolean} dryRun
 */
export async function applyMcpToml(targetFile, rootObject, mcps, dryRun = false) {
  const resolved = resolvePath(targetFile);
  let existing = {};

  if (fileExists(resolved)) {
    try {
      const raw = fs.readFileSync(resolved, 'utf8');
      existing = TOML.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse TOML at ${resolved}: ${e.message}`);
    }
  }

  if (!existing[rootObject]) {
    existing[rootObject] = {};
  }

  for (const mcp of mcps) {
    existing[rootObject][mcp.id] = buildMcpBlock(mcp);
  }

  const tomlStr = TOML.stringify(existing);

  if (dryRun) {
    log.dryRun(`Would write ${mcps.length} MCP(s) to ${resolved} under "${rootObject}"`);
    log.dryRun(tomlStr);
    return;
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, tomlStr, 'utf8');
  log.success(`Wrote ${mcps.length} MCP(s) to ${resolved}`);
}
