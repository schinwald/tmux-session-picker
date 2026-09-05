import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const getFavoritesPath = (environment: NodeJS.ProcessEnv = process.env) =>
  join(
    environment.XDG_CONFIG_HOME || join(homedir(), '.config'),
    'tmux-session-picker',
    'favorites.json',
  );

export const favoritesPath = getFavoritesPath();

export const loadFavorites = (path = favoritesPath): Set<string> => {
  try {
    if (!existsSync(path)) return new Set();
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
};

export const saveFavorites = (favorites: Set<string>, path = favoritesPath): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify([...favorites].sort(), null, 2)}\n`);
};
