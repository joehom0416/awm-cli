import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSyncCommand } from '../src/commands/sync.js';

test('sync command: exists and has correct name', () => {
  const cmd = makeSyncCommand();
  assert.equal(cmd.name(), 'sync');
});

test('sync command: has --dry-run option', () => {
  const cmd = makeSyncCommand();
  const option = cmd.options.find(o => o.long === '--dry-run');
  assert.ok(option, 'should have --dry-run option');
});
