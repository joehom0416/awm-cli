import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const tmpDir = path.join(os.tmpdir(), `awm-adapter-${crypto.randomBytes(6).toString('hex')}`);

before(() => fs.mkdirSync(tmpDir, { recursive: true }));
after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const { buildMcpBlock, applyMcpJson } = await import('../src/adapters/jsonAdapter.js');
const { applyMcpToml } = await import('../src/adapters/tomlAdapter.js');

// Set isolated registry so skillApplier can find skills dir
process.env.AWM_REGISTRY = path.join(tmpDir, 'registry');
const { applySkills } = await import('../src/adapters/skillApplier.js');
const { ensureRegistryDirs } = await import('../src/registry/paths.js');
const { getSkillsDir } = await import('../src/registry/paths.js');
ensureRegistryDirs();

// --- buildMcpBlock ---

test('buildMcpBlock: includes command', () => {
  const block = buildMcpBlock({ id: 'x', transport: 'stdio', command: 'npx' });
  assert.equal(block.command, 'npx');
});

test('buildMcpBlock: strips id and transport', () => {
  const block = buildMcpBlock({ id: 'x', transport: 'stdio', command: 'npx' });
  assert.equal(block.id, undefined);
  assert.equal(block.transport, undefined);
});

test('buildMcpBlock: includes args when present', () => {
  const block = buildMcpBlock({ id: 'x', transport: 'stdio', command: 'npx', args: ['-y', 'pkg'] });
  assert.deepEqual(block.args, ['-y', 'pkg']);
});

test('buildMcpBlock: omits args when empty array', () => {
  const block = buildMcpBlock({ id: 'x', transport: 'stdio', command: 'npx', args: [] });
  assert.equal(block.args, undefined);
});

test('buildMcpBlock: passthrough env without expanding ${env:VAR}', () => {
  const block = buildMcpBlock({
    id: 'x', transport: 'stdio', command: 'npx',
    env: { TOKEN: '${env:MY_TOKEN}' },
  });
  assert.equal(block.env.TOKEN, '${env:MY_TOKEN}');
});

test('buildMcpBlock: omits env when empty object', () => {
  const block = buildMcpBlock({ id: 'x', transport: 'stdio', command: 'npx', env: {} });
  assert.equal(block.env, undefined);
});

// --- applyMcpJson ---

test('applyMcpJson: dry-run does not write file', async () => {
  const target = path.join(tmpDir, 'dry-run.json');
  await applyMcpJson(target, 'mcpServers', [{ id: 'g', transport: 'stdio', command: 'npx' }], true);
  assert.equal(fs.existsSync(target), false);
});

test('applyMcpJson: writes MCP under rootObject', async () => {
  const target = path.join(tmpDir, 'mcp-out.json');
  await applyMcpJson(target, 'mcpServers', [{ id: 'gh', transport: 'stdio', command: 'npx', args: ['-y', 'pkg'] }], false);
  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.ok(data.mcpServers?.gh);
  assert.equal(data.mcpServers.gh.command, 'npx');
});

test('applyMcpJson: merges without clobbering other keys', async () => {
  const target = path.join(tmpDir, 'merge.json');
  fs.writeFileSync(target, JSON.stringify({ mcpServers: { existing: { command: 'old' } }, otherKey: 42 }));
  await applyMcpJson(target, 'mcpServers', [{ id: 'new', transport: 'stdio', command: 'new-cmd' }], false);
  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.ok(data.mcpServers.existing); // not clobbered
  assert.ok(data.mcpServers.new);
  assert.equal(data.otherKey, 42);    // top-level keys preserved
});

test('applyMcpJson: uses custom rootObject (servers)', async () => {
  const target = path.join(tmpDir, 'copilot.json');
  await applyMcpJson(target, 'servers', [{ id: 'gh', transport: 'stdio', command: 'npx' }], false);
  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.ok(data.servers?.gh);
  assert.equal(data.mcpServers, undefined);
});

// --- applyMcpToml ---

test('applyMcpToml: writes valid TOML with rootObject', async () => {
  const target = path.join(tmpDir, 'config.toml');
  await applyMcpToml(target, 'mcpServers', [{ id: 'gh', transport: 'stdio', command: 'npx', args: ['-y', 'p'] }], false);
  const raw = fs.readFileSync(target, 'utf8');
  assert.ok(raw.includes('[mcpServers'));
  assert.ok(raw.includes('npx'));
});

test('applyMcpToml: dry-run does not write file', async () => {
  const target = path.join(tmpDir, 'dry-toml.toml');
  await applyMcpToml(target, 'mcpServers', [{ id: 'x', transport: 'stdio', command: 'node' }], true);
  assert.equal(fs.existsSync(target), false);
});

// --- applySkills ---

test('applySkills: dry-run does not copy', async () => {
  // Create a skill in the registry
  const skillDir = path.join(getSkillsDir(), 'my-skill');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# My Skill');

  const dest = path.join(tmpDir, 'skills-dest');
  await applySkills(['my-skill'], dest, true);
  assert.equal(fs.existsSync(path.join(dest, 'my-skill')), false);
});

test('applySkills: throws when SKILL.md missing', async () => {
  // Create skill dir without SKILL.md
  const skillDir = path.join(getSkillsDir(), 'bad-skill');
  fs.mkdirSync(skillDir, { recursive: true });

  await assert.rejects(
    () => applySkills(['bad-skill'], path.join(tmpDir, 'irrelevant'), false),
    /SKILL\.md/,
  );
});
