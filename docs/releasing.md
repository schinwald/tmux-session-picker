# Releasing

1. Run the local checks:

   ```sh
   bun test src
   bun run build
   ```

2. Commit and push `main`.
3. Create and push an annotated version tag:

   ```sh
   git tag -a vX.Y.Z -m 'Release vX.Y.Z'
   git push origin vX.Y.Z
   ```

4. Wait for the release workflow to publish `tmux-session-picker-darwin-universal.tar.gz` and `tmux-session-picker.sha256`.
5. Copy the release archive SHA-256 into `homebrew-tmux-session-picker/Formula/tmux-session-picker.rb`; update its versioned URL, then commit and push the tap.
6. Validate and install from the tap:

   ```sh
   brew style Formula/tmux-session-picker.rb
   brew audit --new --strict schinwald/tmux-session-picker/tmux-session-picker
   brew update
   brew upgrade tmux-session-picker
   ```

7. Run `tmux-session-picker` inside and outside tmux. Confirm starting, attaching, filtering, and favorite persistence.
