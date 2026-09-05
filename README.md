# tmux-session-picker

Interactive picker for [tmuxinator](https://github.com/tmuxinator/tmuxinator) projects. It shows whether a session is running, filters projects as you type, and starts then attaches to the chosen session.

## Requirements

- [tmux](https://github.com/tmux/tmux)
- [tmuxinator](https://github.com/tmuxinator/tmuxinator)

## Install

### Homebrew

```sh
brew tap schinwald/tmux-session-picker
brew install tmux-session-picker
```

### Release archive

Download the macOS archive for a release, then install the executable matching your architecture:

```sh
curl -LO https://github.com/schinwald/tmux-session-picker/releases/download/vX.Y.Z/tmux-session-picker-darwin-universal.tar.gz
tar -xzf tmux-session-picker-darwin-universal.tar.gz
install -m 755 bin/tmux-session-picker-darwin-arm64 ~/bin/tmux-session-picker
```

Use `tmux-session-picker-darwin-x86_64` on Intel Macs. Ensure `~/bin` is on `PATH`.

## Usage

Run from a shell:

```sh
tmux-session-picker
```

Options:

```text
-h, --help     Show usage
-v, --version  Show version number
```

Select a project to start it if needed, then attach to its tmux session. When run inside tmux, it switches the current client instead. It reports a clear error if `tmux` or `tmuxinator` is not installed.

### tmux key binding

Open the picker in a popup with `prefix` + `p`:

```tmux
bind-key p display-popup -E -w 90% -h 80% 'tmux-session-picker'
```

Reload tmux after changing `~/.tmux.conf`:

```sh
tmux source-file ~/.tmux.conf
```

## Controls

- Type to filter projects
- Up/down arrows: move selection
- Enter or double-click: open selected project
- Ctrl-F: toggle selected project as a favorite
- Esc, `q` with an empty query, or Ctrl-C: close picker

Favorites appear first and are stored at `$XDG_CONFIG_HOME/tmux-session-picker/favorites.json`, or `~/.config/tmux-session-picker/favorites.json` when `XDG_CONFIG_HOME` is unset.

## Development

```sh
bun test src
bun run build
```

The compiled local binary is written to `dist/tmux-session-picker`.

## Releasing

See [docs/releasing.md](docs/releasing.md).
