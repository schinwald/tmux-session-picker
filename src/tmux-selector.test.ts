import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { favoritesPath, loadFavorites, saveFavorites } from './favorites';
import { displayRoot, sessionName, sortProjects, type Project } from './projects';

const project = (name: string): Project => ({
  name,
  scope: 'scope',
  project: `scope/${name}`,
  root: `/tmp/${name}`,
  running: false,
});

describe('tmux selector project logic', () => {
  test('uses the project basename when no tmuxinator config exists', () => {
    expect(sessionName('scope/example-project')).toBe('example-project');
  });

  test('displays home and non-home roots', () => {
    expect(displayRoot('/tmp/example')).toBe('/tmp/example');
    expect(displayRoot(`${process.env.HOME}/example`)).toBe('~/example');
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
  test('uses a stable user configuration path', () => {
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
