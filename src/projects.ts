import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  try {
    const output = execFileSync('tmuxinator', ['list', '--newline'], {
      encoding: 'utf8',
    });
    const tmuxinatorProjects = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('tmuxinator projects:'))
      .map((project): Project => {
        const session = sessionName(project);
        return {
          name: session,
          scope: project.split('/')[0] ?? '',
          project,
          root: getRoot(project),
          running: activeSessions.some((activeSession) => activeSession.name === session),
          source: 'tmuxinator',
          session,
        };
      });

    return mergeProjects(tmuxinatorProjects, activeSessions);
  } catch {
    return mergeProjects([], activeSessions);
  }
};
