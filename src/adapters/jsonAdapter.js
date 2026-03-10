import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from '../utils/fileUtils.js';
import { resolvePath } from '../utils/pathResolver.js';
import { log } from '../utils/logger.js';

/**
 * Build the MCP block for a tool config file from an MCP definition.
 * Strips internal fields (id, transport). Does NOT expand ${env:VAR} in env values.
 * @param {object} mcp
 * @returns {object}
 */
export function buildMcpBlock(mcp) {
  const block = {
    command: mcp.command,
  };
  if (mcp.args && mcp.args.length > 0) {
    block.args = mcp.args;
  }
  if (mcp.env && Object.keys(mcp.env).length > 0) {
    block.env = mcp.env; // passthrough — NOT expanded
  }
  return block;
}

/**
 * Apply MCPs to a JSON config file (merge-safe).
 * Reads existing file, merges into [rootObject] key, writes back (or dry-runs).
 * @param {string} targetFile  may contain ~ or env vars
 * @param {string} rootObject  e.g. "mcpServers"
 * @param {object[]} mcps      canonical MCP definitions
 * @param {boolean} dryRun
 */
export async function applyMcpJson(targetFile, rootObject, mcps, dryRun = false) {
  const resolved = resolvePath(targetFile);
  const existing = readJson(resolved) ?? {};

  if (!existing[rootObject]) {
    existing[rootObject] = {};
  }

  for (const mcp of mcps) {
    existing[rootObject][mcp.id] = buildMcpBlock(mcp);
  }

  if (dryRun) {
    log.dryRun(`Would write ${mcps.length} MCP(s) to ${resolved} under "${rootObject}"`);
    log.dryRun(JSON.stringify(existing, null, 2));
    return;
  }

  writeJson(resolved, existing);
  log.success(`Wrote ${mcps.length} MCP(s) to ${resolved}`);
}
