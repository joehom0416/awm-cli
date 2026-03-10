#!/usr/bin/env node
/**
 * Seeds the AWM registry with default MCPs and skills.
 * Safe to re-run — skips files that already exist unless --force is passed.
 *
 * Called automatically via npm postinstall.
 * Also called by `awm setup [--force]`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegistryRoot } from './utils/pathResolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULTS_DIR = path.join(__dirname, 'defaults');

/**
 * Recursively copy src directory to dest.
 * Uses Node.js built-in fs.cpSync (Node 16.7+).
 */
function copyDirSync(src, dest, force) {
  if (!fs.existsSync(src)) return;
  if (!force && fs.existsSync(dest)) return; // skip existing
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Copy a single file to dest path.
 * Skips if dest exists and force=false.
 */
function copyFileIfMissing(src, dest, force) {
  if (!force && fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

export function runSeed(force = false) {
  const registryRoot = getRegistryRoot();

  // Ensure all registry dirs exist
  for (const sub of ['mcps', 'skills', 'profiles', 'tools']) {
    fs.mkdirSync(path.join(registryRoot, sub), { recursive: true });
  }

  const results = { mcps: [], skills: [], tools: [], skipped: [] };

  // --- Seed MCPs ---
  const defaultMcpsDir = path.join(DEFAULTS_DIR, 'mcps');
  if (fs.existsSync(defaultMcpsDir)) {
    for (const file of fs.readdirSync(defaultMcpsDir)) {
      if (!file.endsWith('.json')) continue;
      const src = path.join(defaultMcpsDir, file);
      const dest = path.join(registryRoot, 'mcps', file);
      const copied = copyFileIfMissing(src, dest, force);
      const id = file.replace(/\.json$/, '');
      if (copied) results.mcps.push(id);
      else results.skipped.push(`mcp:${id}`);
    }
  }

  // --- Seed Tools ---
  const defaultToolsDir = path.join(DEFAULTS_DIR, 'tools');
  if (fs.existsSync(defaultToolsDir)) {
    for (const file of fs.readdirSync(defaultToolsDir)) {
      if (!file.endsWith('.json')) continue;
      const src = path.join(defaultToolsDir, file);
      const dest = path.join(registryRoot, 'tools', file);
      const copied = copyFileIfMissing(src, dest, force);
      const id = file.replace(/\.json$/, '');
      if (copied) results.tools.push(id);
      else results.skipped.push(`tool:${id}`);
    }
  }

  // --- Seed Skills ---
  const defaultSkillsDir = path.join(DEFAULTS_DIR, 'skills');
  if (fs.existsSync(defaultSkillsDir)) {
    for (const name of fs.readdirSync(defaultSkillsDir)) {
      const src = path.join(defaultSkillsDir, name);
      if (!fs.statSync(src).isDirectory()) continue;
      const dest = path.join(registryRoot, 'skills', name);
      const existed = fs.existsSync(dest);
      if (!force && existed) {
        results.skipped.push(`skill:${name}`);
        continue;
      }
      fs.cpSync(src, dest, { recursive: true, force: true });
      results.skills.push(name);
    }
  }

  return results;
}

// Only auto-run when executed directly (postinstall or `node src/seed.js`)
// NOT when imported as a module by src/commands/setup.js
const selfPath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(selfPath);

if (isDirectRun) {
  const force = process.argv.includes('--force');
  try {
    const results = runSeed(force);

    const seeded = results.mcps.length + results.skills.length + results.tools.length;
    if (results.tools.length > 0) {
      console.log(`[awm] Seeded tools: ${results.tools.join(', ')}`);
    }
    if (results.mcps.length > 0) {
      console.log(`[awm] Seeded MCPs: ${results.mcps.join(', ')}`);
    }
    if (results.skills.length > 0) {
      console.log(`[awm] Seeded skills: ${results.skills.join(', ')}`);
    }
    if (results.skipped.length > 0 && seeded > 0) {
      console.log(`[awm] Skipped (already present): ${results.skipped.join(', ')}`);
    }
    if (seeded === 0) {
      if (results.skipped.length > 0) {
        console.log(`[awm] Registry already seeded. Use --force to overwrite.`);
      } else {
        console.log(`[awm] Registry seeded (nothing to add).`);
      }
    }
  } catch (err) {
    // Don't fail the npm install if seeding fails
    console.warn(`[awm] Warning: could not seed registry: ${err.message}`);
  }
}
