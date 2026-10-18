import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ProjectSource = 'tmuxinator' | 'tmux';

export type TmuxSession = {
  name: string;
  path: string;
};

export type Project = {
  name: string;
  scope: string;
  project: string;
  root: string;
  running: boolean;
  source: ProjectSource;
  session: string;
};

const home = homedir();

const configRoot = join(home, '.config', 'tmuxinator');

const configPath = (project: string) => join(configRoot, `${project}.yml`);

const readConfig = (project: string): string | undefined => {
  try {
    return readFileSync(configPath(project), 'utf8');
  } catch {
    return undefined;
  }
};

const sessionNameFromConfig = (project: string, config: string) =>
  config.match(/^name:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]?.trim() ||
  project.split('/').at(-1) ||
  project;

export const sessionName = (project: string) =>
  sessionNameFromConfig(project, readConfig(project) ?? '');

export const displayRoot = (root: string) =>
  root === home ? '~' : root.startsWith(`${home}/`) ? `~/${root.slice(home.length + 1)}` : root;

const runningSessions = (): TmuxSession[] => {
  try {
    const output = execFileSync('tmux', ['list-sessions', '-F', '#{session_name}\t#{session_path}'], {
      encoding: 'utf8',
    });
    return output.trim().split('\n').flatMap((line) => {
      const [name, path] = line.split('\t');
      return name && path ? [{ name, path }] : [];
    });
  } catch {
    return [];
  }
};

const rootFromConfig = (config: string) => {
  const root = config.match(/^root:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]?.trim();
  return root ? root.replace(/^~(?=\/|$)/, home) : 'Root unavailable';
};

const configProjects = (directory = configRoot, prefix = ''): Array<{ project: string; config: string }> => {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const project = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return configProjects(path, project);
      if (!entry.isFile() || !entry.name.endsWith('.yml')) return [];
      return [{ project: project.slice(0, -4), config: readFileSync(path, 'utf8') }];
    });
  } catch {
    return [];
  }
};

export const mergeProjects = (tmuxinatorProjects: Project[], activeSessions: Iterable<TmuxSession>): Project[] => {
  const configuredSessions = new Set(tmuxinatorProjects.map((project) => project.session));
  const rawSessions = [...new Map([...activeSessions].map((session) => [session.name, session])).values()]
    .filter((session) => !configuredSessions.has(session.name))
    .map((session): Project => ({
      name: session.name,
      scope: 'tmux',
      project: `tmux/${session.name}`,
      root: session.path,
      running: true,
      source: 'tmux',
      session: session.name,
    }));

  return [...tmuxinatorProjects, ...rawSessions];
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
  const activeSessions = runningSessions();
  const activeSessionNames = new Set(activeSessions.map((session) => session.name));
  const tmuxinatorProjects = configProjects().map(({ project, config }): Project => {
    const session = sessionNameFromConfig(project, config);
    return {
      name: session,
      scope: project.split('/')[0] ?? '',
      project,
      root: rootFromConfig(config),
      running: activeSessionNames.has(session),
      source: 'tmuxinator',
      session,
    };
  });

  return mergeProjects(tmuxinatorProjects, activeSessions);
};
