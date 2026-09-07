import { describe, expect, test } from 'bun:test';
import { openProject, type CommandRunner } from './launcher';
import type { Project } from './projects';

const project = (running = false): Project => ({
  name: 'example',
  scope: 'scope',
  project: 'scope/example',
  root: '/tmp/example',
  running,
  source: 'tmuxinator',
  session: 'example',
});

const rawSession = (): Project => ({
  name: 'worktree-session',
  scope: 'tmux',
  project: 'tmux/worktree-session',
  root: 'Running tmux session',
  running: true,
  source: 'tmux',
  session: 'worktree-session',
});

const runner = (statusByCommand: Record<string, number> = {}) => {
  const calls: Array<{ command: string; arguments_: string[] }> = [];
  const run: CommandRunner = (command, arguments_) => {
    calls.push({ command, arguments_ });
    return statusByCommand[command] ?? 0;
  };
  return { calls, run };
};

describe('session launcher', () => {
  test('starts a lazy project then attaches outside tmux', () => {
    const { calls, run } = runner();
    expect(openProject(project(), { insideTmux: false, run })).toBe(0);
    expect(calls).toEqual([
      { command: 'tmuxinator', arguments_: ['start', 'scope/example'] },
      { command: 'tmux', arguments_: ['attach-session', '-t', 'example'] },
    ]);
  });

  test('switches directly to a running project inside tmux', () => {
    const { calls, run } = runner();
    expect(openProject(project(true), { insideTmux: true, run })).toBe(0);
    expect(calls).toEqual([
      { command: 'tmux', arguments_: ['switch-client', '-t', 'example'] },
    ]);
  });

  test('attaches raw tmux sessions without invoking tmuxinator', () => {
    const { calls, run } = runner();
    expect(openProject(rawSession(), { insideTmux: false, run })).toBe(0);
    expect(calls).toEqual([
      { command: 'tmux', arguments_: ['attach-session', '-t', 'worktree-session'] },
    ]);
  });

  test('switches raw tmux sessions instead of nesting tmux', () => {
    const { calls, run } = runner();
    expect(openProject(rawSession(), { insideTmux: true, run })).toBe(0);
    expect(calls).toEqual([
      { command: 'tmux', arguments_: ['switch-client', '-t', 'worktree-session'] },
    ]);
  });

  test('stops when tmuxinator fails', () => {
    const { calls, run } = runner({ tmuxinator: 1 });
    expect(openProject(project(), { run })).toBe(1);
    expect(calls).toEqual([
      { command: 'tmuxinator', arguments_: ['start', 'scope/example'] },
    ]);
  });

  test('returns tmux attach failures', () => {
    const { calls, run } = runner({ tmux: 2 });
    expect(openProject(project(true), { insideTmux: false, run })).toBe(2);
    expect(calls).toEqual([
      { command: 'tmux', arguments_: ['attach-session', '-t', 'example'] },
    ]);
  });
});
