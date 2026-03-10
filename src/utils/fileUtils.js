import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Use dynamic import for fs-extra (ESM)
let fse;
async function getFse() {
  if (!fse) fse = (await import('fs-extra')).default;
  return fse;
}

/**
 * Read and parse a JSON file. Returns null if file doesn't exist.
 * @param {string} filePath
 * @returns {any}
 */
export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Write an object as JSON to a file, creating parent directories as needed.
 * @param {string} filePath
 * @param {any} data
 */
export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Copy a directory recursively using fs-extra.
 * @param {string} src
 * @param {string} dest
 */
export async function copyDir(src, dest) {
  const fsExtra = await getFse();
  await fsExtra.copy(src, dest, { overwrite: true });
}

/**
 * List immediate subdirectory names within a directory.
 * Returns [] if the directory doesn't exist.
 * @param {string} dirPath
 * @returns {string[]}
 */
export function listDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * List immediate file names within a directory.
 * Returns [] if the directory doesn't exist.
 * @param {string} dirPath
 * @returns {string[]}
 */
export function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(d => d.isFile())
    .map(d => d.name);
}

/**
 * Check if a file or directory exists.
 * @param {string} p
 * @returns {boolean}
 */
export function fileExists(p) {
  return fs.existsSync(p);
}
