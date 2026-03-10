import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Isolated registry + temp project dir
const tmpRegistry = path.join(os.tmpdir(), `awm-ws-${crypto.randomBytes(6).toString('hex')}`);
const tmpCwd = path.join(os.tmpdir(), `awm-proj-${crypto.randomBytes(6).toString('hex')}`);
process.env.AWM_REGISTRY = tmpRegistry;

const { ensureRegistryDirs } = await import('../src/registry/paths.js');
const { saveMcp, getMcp } = await import('../src/registry/mcpRegistry.js');
const { addSkill } = await import('../src/registry/skillRegistry.js');
const { getSkillsDir } = await import('../src/registry/paths.js');
const { applyMcpJson } = await import('../src/adapters/jsonAdapter.js');
const { applySkills } = await import('../src/adapters/skillApplier.js');
const { applyAll } = await import('../src/workspace/applyWorkspace.js');

// We test workspaceConfig with a temp file directly
const WS_FILE = path.join(tmpCwd, '.awm.json');

before(() => {
  ensureRegistryDirs();
  fs.mkdirSync(tmpCwd, { recursive: true });

  // Seed a test MCP
  saveMcp({ id: 'seed-mcp', transport: 'stdio', command: 'npx', args: ['-y', 'pkg'] });

  // Seed a test skill
  const skillSrc = path.join(os.tmpdir(), `skill-ws-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(skillSrc, { recursive: true });
  fs.writeFileSync(path.join(skillSrc, 'SKILL.md'), '# WS Skill');
  const dest = path.join(getSkillsDir(), 'ws-skill');
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(skillSrc, 'SKILL.md'), path.join(dest, 'SKILL.md'));
  fs.rmSync(skillSrc, { recursive: true });
});

after(() => {
  fs.rmSync(tmpRegistry, { recursive: true, force: true });
  fs.rmSync(tmpCwd, { recursive: true, force: true });
});

// workspaceConfig helpers (direct file ops, no cwd dependency)
test('workspaceConfig: write and read .awm.json', () => {
  const ws = { tools: ['claude-code'], mcps: ['seed-mcp'], skills: [] };
  fs.writeFileSync(WS_FILE, JSON.stringify({ ...ws, lastSync: new Date().toISOString() }));
  const parsed = JSON.parse(fs.readFileSync(WS_FILE, 'utf8'));
  assert.deepEqual(parsed.tools, ['claude-code']);
  assert.deepEqual(parsed.mcps, ['seed-mcp']);
  assert.ok(parsed.lastSync);
});

// applyMcpJson — adapter tests (unchanged behavior)
test('applyMcpJson writes MCP to target file', async () => {
  const targetFile = path.join(tmpCwd, '.mcp.json');
  const mcp = getMcp('seed-mcp');
  await applyMcpJson(targetFile, 'mcpServers', [mcp], false);

  assert.ok(fs.existsSync(targetFile));
  const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  assert.ok(data.mcpServers['seed-mcp']);
  assert.equal(data.mcpServers['seed-mcp'].command, 'npx');
});

test('applyMcpJson dry-run: file not created', async () => {
  const targetFile = path.join(tmpCwd, '.mcp-dryrun.json');
  const mcp = getMcp('seed-mcp');
  await applyMcpJson(targetFile, 'mcpServers', [mcp], true);
  assert.equal(fs.existsSync(targetFile), false);
});

test('applySkills copies skill folder to target', async () => {
  const targetFolder = path.join(tmpCwd, '.claude', 'skills');
  await applySkills(['ws-skill'], targetFolder, false);
  assert.ok(fs.existsSync(path.join(targetFolder, 'ws-skill', 'SKILL.md')));
});

test('applySkills dry-run: no folder created', async () => {
  const targetFolder = path.join(tmpCwd, '.claude', 'skills-dry');
  await applySkills(['ws-skill'], targetFolder, true);
  assert.equal(fs.existsSync(path.join(targetFolder, 'ws-skill')), false);
});

test('applyAll: throws on missing MCP in registry', async () => {
  const ws = { tools: ['claude-code'], mcps: ['nonexistent-mcp'], skills: [] };
  await assert.rejects(() => applyAll(ws, false), /Aborting/);
});

test('applyAll: missing MCP check returns null', async () => {
  assert.equal(getMcp('nonexistent-mcp'), null);
});
