# Home Assistant Add-on: VS Code (Microsoft)

Microsoft Visual Studio Code in the browser, integrated into
the Home Assistant frontend. Supports all extensions including
GitHub Copilot.

## Installation

The installation of this add-on is straightforward:

1. Add this repository to your Home Assistant add-on store
2. Search for "VS Code (Microsoft)" in the add-on store
3. Click Install
4. Start the add-on
5. Click "Open Web UI" or use the sidebar panel

## Configuration

**Note**: _Remember to restart the add-on when the configuration is changed._

### Option: `config_path`

The filesystem path to open as the default workspace in VS Code.
Defaults to `/config` which is your Home Assistant configuration directory.

### Option: `packages`

A list of additional system (apt) packages to install during startup.
Useful for installing tools like `mariadb-client`, `mosquitto-clients`, etc.

### Option: `init_commands`

A list of shell commands to execute during add-on initialization,
before VS Code starts. Useful for setting up git credentials, etc.

### Option: `log_level`

The `log_level` option controls the level of log output by the addon and can
be changed to be more or less verbose, which might be useful when you are
dealing with an unknown issue. Possible values are:

- `trace`: Show every detail, like all called internal functions.
- `debug`: Shows detailed debug information.
- `info`: Normal (usually) interesting events.
- `warning`: Exceptional occurrences that are not errors.
- `error`: Runtime errors that do not require immediate action.
- `fatal`: Something went terribly wrong. Add-on becomes unusable.

## Signed-in accounts follow your Home Assistant user

Accounts you sign in to inside VS Code (GitHub, Copilot, and other
extensions' credentials) are stored encrypted on the add-on, per Home
Assistant user. Open VS Code from any browser or device, through any of your
Home Assistant URLs, and you are still signed in. Each Home Assistant user has
their own set.

## Known Issues and Limitations

- This add-on uses the Microsoft VS Code binary. By using it,
  you agree to the [Microsoft Software License Terms](https://code.visualstudio.com/License/).
- The VS Code binary is only available for amd64 and aarch64 architectures.
- First startup may take longer as VS Code initializes its server components.
- After updating to 1.140.0.1 you need to sign in to your accounts once more.
- Only signed-in accounts follow you between browsers. User settings,
  keybindings and UI state are still stored in each browser; use Settings
  Sync to share them.
- If VS Code is open in two browsers at once, the last account change made
  wins. Reload the other browser after signing in or out.

## Support

Open an issue on the [GitHub repository](https://github.com/fonix232/ha-vscode).
