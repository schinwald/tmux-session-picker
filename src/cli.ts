export const programVersion = '0.1.0';

export type CliAction = 'help' | 'version' | null;

export const parseCliArguments = (arguments_: string[]): CliAction => {
  if (arguments_.includes('--help') || arguments_.includes('-h')) return 'help';
  if (arguments_.includes('--version') || arguments_.includes('-v')) return 'version';
  return null;
};

export const usage = `Usage: tmux-session-picker [options]

Interactive picker for tmuxinator projects.

Options:
  -h, --help     Show this help message
  -v, --version  Show version number`;
