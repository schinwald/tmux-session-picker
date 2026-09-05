import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type Project = {
  name: string;
  scope: string;
  project: string;
  root: string;
  running: boolean;
};

const home = homedir();

const configPath = (project: string) =>
  join(home, '.config', 'tmuxinator', `${project}.yml`);

const readConfig = (project: string): string | undefined => {
  try {
    return readFileSync(configPath(project), 'utf8');
  } catch {
    return undefined;
  }
};

export const sessionName = (project: string) => {
  const configuredName = readConfig(project)?.match(/^name:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]?.trim();
  return configuredName || project.split('/').at(-1) || project;
};

export const displayRoot = (root: string) =>
  root === home ? '~' : root.startsWith(`${home}/`) ? `~/${root.slice(home.length + 1)}` : root;

const runningSessions = (): Set<string> => {
  try {
    const output = execFileSync('tmux', ['list-sessions', '-F', '#{session_name}'], {
      encoding: 'utf8',
    });
    return new Set(output.trim().split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
};

const getRoot = (project: string) => {
  try {
    const config = readConfig(project);
    if (!config) return 'Root unavailable';
    const root = config.match(/^root:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]?.trim();
    if (!root) return 'Root unavailable';
    return root.replace(/^~(?=\/|$)/, home);
  } catch {
    return 'Root unavailable';
  }
};

export const sortProjects = (projects: Project[], favorites: Set<string>): Project[] =>
  projects
    .map((project, index) => ({ project, index }))
    .sort(
      (left, right) =>
        Number(favorites.has(right.project.project)) - Number(favorites.has(left.project.project)) ||
        left.index - right.index,
    )
    .map(({ project }) => project);

export const getProjects = (): Project[] => {
  try {
    const output = execFileSync('tmuxinator', ['list', '--newline'], {
      encoding: 'utf8',
    });
    const activeSessions = runningSessions();

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('tmuxinator projects:'))
      .map((project) => ({
        name: sessionName(project),
        scope: project.split('/')[0] ?? '',
        project,
        root: getRoot(project),
        running: activeSessions.has(sessionName(project)),
      }));
  } catch {
    return [];
  }
};
