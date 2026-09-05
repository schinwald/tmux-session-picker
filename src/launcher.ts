import { spawnSync } from 'node:child_process';
import type { Project } from './projects';
import { sessionName } from './projects';

export type CommandRunner = (command: string, arguments_: string[]) => number;

const runCommand: CommandRunner = (command, arguments_) =>
  spawnSync(command, arguments_, { stdio: 'inherit' }).status ?? 1;

export type LauncherOptions = {
  insideTmux?: boolean;
  run?: CommandRunner;
};

export const openProject = (project: Project, options: LauncherOptions = {}): number => {
  const insideTmux = options.insideTmux ?? Boolean(process.env.TMUX);
  const run = options.run ?? runCommand;
  if (!project.running) {
    const started = run('tmuxinator', ['start', project.project]);
    if (started !== 0) return started;
  }

  const command = insideTmux ? 'switch-client' : 'attach-session';
  return run('tmux', [command, '-t', sessionName(project.project)]);
};
