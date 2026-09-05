import { execFileSync } from 'node:child_process';

export type CommandExists = (command: string) => boolean;

const commandExists: CommandExists = (command) => {
  try {
    execFileSync(command, [command === 'tmux' ? '-V' : 'version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export const missingDependencies = (
  exists: CommandExists = commandExists,
): string[] => ['tmux', 'tmuxinator'].filter((command) => !exists(command));

export const dependencyError = (missing: string[]): string =>
  `Missing required command${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Install ${missing.join(' and ')} and try again.`;
