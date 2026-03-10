import os from 'node:os';
import path from 'node:path';

/**
 * Expands ~, %VAR% (Windows), ${VAR}, and ${env:VAR} in a path string,
 * then normalizes the result.
 * @param {string} p
 * @returns {string}
 */
export function resolvePath(p) {
  if (typeof p !== 'string') return p;

  let result = p;

  // Expand ~ to home directory
  if (result.startsWith('~/') || result === '~') {
    result = path.join(os.homedir(), result.slice(1));
  }

  // Expand ${env:VAR} — must come before ${VAR} to avoid partial matches
  result = result.replace(/\$\{env:([^}]+)\}/g, (_, name) => process.env[name] ?? '');

  // Expand ${VAR}
  result = result.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? '');

  // Expand %VAR% (Windows style)
  result = result.replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? '');

  return path.normalize(result);
}

/**
 * Returns the registry root directory.
 * Respects AWM_REGISTRY env var override.
 * @returns {string}
 */
export function getRegistryRoot() {
  return process.env.AWM_REGISTRY
    ?? path.join(os.homedir(), '.agent-workspace', 'registry');
}
