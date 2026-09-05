# Releasing

## One-time setup

Create a fine-grained GitHub personal access token with **Contents: Read and write** access to `schinwald/homebrew-tmux-session-picker`. Add it to the `schinwald/tmux-session-picker` repository as the `HOMEBREW_TAP_TOKEN` Actions secret.

The release workflow uses this token to update the tap formula's release URL and SHA-256 after it publishes the GitHub Release.

## Release steps

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

4. Wait for the release workflow to publish `tmux-session-picker-darwin-universal.tar.gz` and `tmux-session-picker.sha256`, then update `schinwald/homebrew-tmux-session-picker` automatically.
5. Validate and install from the tap:

   ```sh
   brew style "$(brew --repository schinwald/tmux-session-picker)/Formula/tmux-session-picker.rb"
   brew audit --new --strict schinwald/tmux-session-picker/tmux-session-picker
   brew update
   brew upgrade tmux-session-picker
   ```

6. Run `tmux-session-picker` inside and outside tmux. Confirm starting, attaching, filtering, and favorite persistence.
