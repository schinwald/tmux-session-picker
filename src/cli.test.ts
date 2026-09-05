import { describe, expect, test } from 'bun:test';
import { parseCliArguments, programVersion, usage } from './cli';

describe('CLI arguments', () => {
  test('recognizes help flags', () => {
    expect(parseCliArguments(['--help'])).toBe('help');
    expect(parseCliArguments(['-h'])).toBe('help');
    expect(usage).toContain('tmux-session-picker');
  });

  test('recognizes version flags', () => {
    expect(parseCliArguments(['--version'])).toBe('version');
    expect(parseCliArguments(['-v'])).toBe('version');
    expect(programVersion).toBe('0.1.0');
  });

  test('does not select an action without a flag', () => {
    expect(parseCliArguments([])).toBeNull();
  });
});
