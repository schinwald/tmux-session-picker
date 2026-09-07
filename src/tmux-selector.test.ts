import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { favoritesPath, getFavoritesPath, loadFavorites, saveFavorites } from './favorites';
import { displayRoot, mergeProjects, sessionName, sortProjects, type Project } from './projects';

const project = (name: string, overrides: Partial<Project> = {}): Project => ({
  name,
  scope: 'scope',
  project: `scope/${name}`,
  root: `/tmp/${name}`,
  running: false,
  source: 'tmuxinator',
  session: name,
  ...overrides,
});

describe('tmux selector project logic', () => {
  test('uses the project basename when no tmuxinator config exists', () => {
    expect(sessionName('scope/example-project')).toBe('example-project');
  });

  test('displays home and non-home roots', () => {
    expect(displayRoot('/tmp/example')).toBe('/tmp/example');
    expect(displayRoot(`${process.env.HOME}/example`)).toBe('~/example');
  });

  test('merges running tmux sessions after tmuxinator projects', () => {
    const projects = mergeProjects([project('configured')], [
      { name: 'configured', path: '/projects/configured' },
      { name: 'worktree-session', path: '/worktrees/example/feature-test' },
    ]);

    expect(projects).toEqual([
      project('configured'),
      {
        name: 'worktree-session',
        scope: 'tmux',
        project: 'tmux/worktree-session',
        root: '/worktrees/example/feature-test',
        running: true,
        source: 'tmux',
        session: 'worktree-session',
      },
    ]);
  });

  test('deduplicates by canonical tmux session name with tmuxinator winning', () => {
    const configured = project('display-name', { session: 'canonical-session' });
    const projects = mergeProjects([configured], [
      { name: 'canonical-session', path: '/projects/first' },
      { name: 'canonical-session', path: '/projects/second' },
    ]);

    expect(projects).toEqual([configured]);
  });

  test('sorts favorites first while preserving original order', () => {
    const projects = [project('zulu'), project('alpha'), project('bravo')];
    const sorted = sortProjects(projects, new Set(['scope/alpha', 'scope/bravo']));

    expect(sorted.map(({ name }) => name)).toEqual(['alpha', 'bravo', 'zulu']);
  });

  test('preserves tmuxinator order among equal favorite status', () => {
    const projects = [project('zulu'), project('alpha'), project('bravo')];
    const sorted = sortProjects(projects, new Set(['scope/bravo']));

    expect(sorted.map(({ name }) => name)).toEqual(['bravo', 'zulu', 'alpha']);
  });
});

describe('favorites storage', () => {
  test('uses XDG_CONFIG_HOME or a stable user configuration path', () => {
    expect(getFavoritesPath({ XDG_CONFIG_HOME: '/tmp/config' })).toBe(
      '/tmp/config/tmux-session-picker/favorites.json',
    );
    expect(favoritesPath).toBe(
      join(homedir(), '.config', 'tmux-session-picker', 'favorites.json'),
    );
  });

  test('creates parent directories and stores sorted favorites', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tmux-session-picker-'));
    const path = join(directory, 'config', 'favorites.json');

    try {
      saveFavorites(new Set(['scope/zulu', 'scope/alpha']), path);
      expect(readFileSync(path, 'utf8')).toBe('[\n  "scope/alpha",\n  "scope/zulu"\n]\n');
      expect([...loadFavorites(path)]).toEqual(['scope/alpha', 'scope/zulu']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
