import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { resolvePath, getRegistryRoot } from '../src/utils/pathResolver.js';

test('expands ~ to home directory', () => {
  const result = resolvePath('~/foo/bar');
  assert.ok(result.startsWith(os.homedir()));
  assert.ok(result.includes('foo'));
});

test('expands ~ alone to home directory', () => {
  const result = resolvePath('~');
  assert.equal(result, path.normalize(os.homedir()));
});

test('expands %USERPROFILE% style vars', () => {
  process.env._AWM_TEST_VAR = 'testval';
  const result = resolvePath('%_AWM_TEST_VAR%/some/path');
  assert.ok(result.includes('testval'));
  delete process.env._AWM_TEST_VAR;
});

test('expands ${VAR} style vars', () => {
  process.env._AWM_TEST_VAR2 = 'hello';
  const result = resolvePath('${_AWM_TEST_VAR2}/world');
  assert.ok(result.includes('hello'));
  delete process.env._AWM_TEST_VAR2;
});

test('expands ${env:VAR} style vars', () => {
  process.env._AWM_TEST_VAR3 = 'envval';
  const result = resolvePath('${env:_AWM_TEST_VAR3}/path');
  assert.ok(result.includes('envval'));
  delete process.env._AWM_TEST_VAR3;
});

test('leaves unchanged path alone', () => {
  const p = '/absolute/path/to/file.json';
  const result = resolvePath(p);
  assert.equal(result, path.normalize(p));
});

test('normalizes path separators', () => {
  const result = resolvePath('foo//bar/../baz');
  // Should be normalized (no double slashes, .. resolved)
  assert.ok(!result.includes('..'));
});

test('getRegistryRoot respects AWM_REGISTRY env var', () => {
  const orig = process.env.AWM_REGISTRY;
  process.env.AWM_REGISTRY = '/custom/registry';
  assert.equal(getRegistryRoot(), '/custom/registry');
  if (orig === undefined) delete process.env.AWM_REGISTRY;
  else process.env.AWM_REGISTRY = orig;
});

test('getRegistryRoot defaults to ~/.agent-workspace/registry', () => {
  const orig = process.env.AWM_REGISTRY;
  delete process.env.AWM_REGISTRY;
  const result = getRegistryRoot();
  assert.ok(result.includes('.agent-workspace'));
  assert.ok(result.includes('registry'));
  if (orig !== undefined) process.env.AWM_REGISTRY = orig;
});
