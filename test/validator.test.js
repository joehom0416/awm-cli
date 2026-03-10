import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMcp, validateProfile, validateToolDef } from '../src/utils/validator.js';

// validateMcp
test('validateMcp: valid stdio MCP', () => {
  const { valid, errors } = validateMcp({ id: 'github', transport: 'stdio', command: 'npx' });
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test('validateMcp: missing id', () => {
  const { valid, errors } = validateMcp({ transport: 'stdio', command: 'npx' });
  assert.equal(valid, false);
  assert.ok(errors.some(e => e.includes('"id"')));
});

test('validateMcp: missing command', () => {
  const { valid, errors } = validateMcp({ id: 'x', transport: 'stdio' });
  assert.equal(valid, false);
  assert.ok(errors.some(e => e.includes('"command"')));
});

test('validateMcp: invalid transport', () => {
  const { valid, errors } = validateMcp({ id: 'x', transport: 'grpc', command: 'node' });
  assert.equal(valid, false);
  assert.ok(errors.some(e => e.includes('transport')));
});

test('validateMcp: null input', () => {
  const { valid } = validateMcp(null);
  assert.equal(valid, false);
});

// validateProfile
test('validateProfile: valid project profile', () => {
  const { valid } = validateProfile({ id: 'dev', tool: 'claude-code', scope: 'project' });
  assert.equal(valid, true);
});

test('validateProfile: valid global profile', () => {
  const { valid } = validateProfile({ id: 'g', tool: 'cursor', scope: 'global' });
  assert.equal(valid, true);
});

test('validateProfile: missing scope', () => {
  const { valid, errors } = validateProfile({ id: 'p', tool: 'cursor' });
  assert.equal(valid, false);
  assert.ok(errors.some(e => e.includes('scope')));
});

test('validateProfile: invalid scope', () => {
  const { valid } = validateProfile({ id: 'p', tool: 'cursor', scope: 'local' });
  assert.equal(valid, false);
});

test('validateProfile: missing tool', () => {
  const { valid } = validateProfile({ id: 'p', scope: 'project' });
  assert.equal(valid, false);
});

// validateToolDef
test('validateToolDef: valid tool def', () => {
  const { valid } = validateToolDef({ id: 'claude-code', name: 'Claude Code', supports: { mcp: true } });
  assert.equal(valid, true);
});

test('validateToolDef: missing name', () => {
  const { valid, errors } = validateToolDef({ id: 'x', supports: {} });
  assert.equal(valid, false);
  assert.ok(errors.some(e => e.includes('"name"')));
});

test('validateToolDef: missing supports', () => {
  const { valid } = validateToolDef({ id: 'x', name: 'X' });
  assert.equal(valid, false);
});

test('validateToolDef: null input', () => {
  const { valid } = validateToolDef(null);
  assert.equal(valid, false);
});
