import { spawnSync } from 'node:child_process';
import type { Project } from './projects';
import { sessionName } from './projects';

export const openProject = (project: Project): number => {
  const insideTmux = Boolean(process.env.TMUX);
  if (!project.running) {
    const started = spawnSync('tmuxinator', ['start', project.project], { stdio: 'inherit' });
    if (started.status !== 0) return started.status ?? 1;
  }

  const command = insideTmux ? 'switch-client' : 'attach-session';
  const result = spawnSync('tmux', [command, '-t', sessionName(project.project)], {
    stdio: 'inherit',
  });
  return result.status ?? 1;
};
