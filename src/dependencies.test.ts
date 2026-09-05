import { describe, expect, test } from 'bun:test';
import { dependencyError, missingDependencies } from './dependencies';

describe('dependency preflight', () => {
  test('reports missing dependencies', () => {
    expect(missingDependencies((command) => command === 'tmux')).toEqual(['tmuxinator']);
    expect(dependencyError(['tmuxinator'])).toBe(
      'Missing required command: tmuxinator. Install tmuxinator and try again.',
    );
  });

  test('reports all missing dependencies', () => {
    const missing = missingDependencies(() => false);
    expect(missing).toEqual(['tmux', 'tmuxinator']);
    expect(dependencyError(missing)).toBe(
      'Missing required commands: tmux, tmuxinator. Install tmux and tmuxinator and try again.',
    );
  });
});
