import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Set isolated registry before importing registry modules
const tmpRegistry = path.join(os.tmpdir(), `awm-test-${crypto.randomBytes(6).toString('hex')}`);
process.env.AWM_REGISTRY = tmpRegistry;

// Dynamic imports after env var is set
const { ensureRegistryDirs } = await import('../src/registry/paths.js');
const { listMcps, getMcp, saveMcp, removeMcp } = await import('../src/registry/mcpRegistry.js');
const { listSkills, addSkill, removeSkill, showSkill } = await import('../src/registry/skillRegistry.js');

before(() => {
  ensureRegistryDirs();
});

after(() => {
  fs.rmSync(tmpRegistry, { recursive: true, force: true });
});

// MCP round-trip
test('MCP: save and get', () => {
  saveMcp({ id: 'test-mcp', transport: 'stdio', command: 'node', args: ['server.js'] });
  const mcp = getMcp('test-mcp');
  assert.equal(mcp.id, 'test-mcp');
  assert.equal(mcp.command, 'node');
  assert.deepEqual(mcp.args, ['server.js']);
});

test('MCP: list includes saved MCP', () => {
  const ids = listMcps();
  assert.ok(ids.includes('test-mcp'));
});

test('MCP: remove', () => {
  removeMcp('test-mcp');
  assert.equal(getMcp('test-mcp'), null);
  assert.ok(!listMcps().includes('test-mcp'));
});

test('MCP: remove nonexistent throws', () => {
  assert.throws(() => removeMcp('nonexistent'), /not found/);
});

test('MCP: saveMcp validates — throws on missing command', () => {
  assert.throws(() => saveMcp({ id: 'bad', transport: 'stdio' }), /Invalid MCP/);
});

// Skill round-trip
test('Skill: add from directory', async () => {
  const srcDir = path.join(os.tmpdir(), `skill-src-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'SKILL.md'), '# Test Skill\nDoes things.');

  await addSkill('my-test-skill', srcDir);
  const names = listSkills();
  assert.ok(names.includes('my-test-skill'));

  const content = showSkill('my-test-skill');
  assert.ok(content.includes('Test Skill'));

  fs.rmSync(srcDir, { recursive: true });
});

test('Skill: remove', () => {
  removeSkill('my-test-skill');
  assert.ok(!listSkills().includes('my-test-skill'));
});

test('Skill: remove nonexistent throws', () => {
  assert.throws(() => removeSkill('ghost'), /not found/);
});
