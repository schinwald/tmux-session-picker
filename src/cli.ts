import packageJson from '../package.json' with { type: 'json' };

export const programVersion = packageJson.version;

export type CliAction = 'help' | 'version' | { session: string } | null;

export const parseCliArguments = (arguments_: string[]): CliAction => {
  if (arguments_.includes('--help') || arguments_.includes('-h')) return 'help';
  if (arguments_.includes('--version') || arguments_.includes('-v')) return 'version';

  const sessionOption = arguments_.findIndex((argument) => argument === '--session' || argument === '-s');
  if (sessionOption >= 0 && arguments_[sessionOption + 1]) {
    return { session: arguments_[sessionOption + 1] };
  }

  return null;
};

export const usage = `Usage: tmux-session-picker [options]

Interactive picker for tmuxinator projects.

Options:
  -h, --help             Show this help message
  -v, --version          Show version number
  -s, --session <name>   Open a specific tmux session directly`;
