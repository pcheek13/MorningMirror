# MMM-WIFI

Display a solid Wi‑Fi logo as network signal for MorningMirror (and forks) and let users update Wi‑Fi directly from the settings panel. The module now targets Raspberry Pi OS **Bookworm** using **NetworkManager** (`nmcli`), so it no longer edits `/etc/wpa_supplicant/wpa_supplicant.conf`.

![Signal icons: none, weak, normal, strong, loading](https://raw.githubusercontent.com/pcheek13/MMM-WIFI/master/icons.gif)

## Dependencies
- MorningMirror (tested on Raspberry Pi 5)
- [NPM Ping](https://www.npmjs.com/package/ping)
- `nmcli` (NetworkManager) available on Raspberry Pi OS Bookworm

## Installation (single copy/paste block)
Run this on your Pi. Set `MIRROR_USER` if the MagicMirror/MorningMirror process runs as a different user (defaults to the current shell user):
```bash
MIRROR_ROOT=${MIRROR_ROOT:-/home/pi/MorningMirror} && \
MIRROR_USER=${MIRROR_USER:-$(whoami)} && \
cd "$MIRROR_ROOT/modules" && \
rm -rf MMM-WIFI && \
git clone https://github.com/pcheek13/MMM-WIFI.git && \
cd MMM-WIFI && \
npm install && \
sudo install -m 0755 scripts/mm-set-wifi.sh /usr/local/sbin/mm-set-wifi.sh && \
echo "${MIRROR_USER} ALL=(root) NOPASSWD: /usr/local/sbin/mm-set-wifi.sh, $(pwd)/scripts/update-wifi.sh, $(pwd)/scripts/mm-set-wifi.sh" | sudo tee /etc/sudoers.d/magicmirror-wifi >/dev/null && \
sudo chmod 440 /etc/sudoers.d/magicmirror-wifi
```
> The sudoers entry is tightly scoped to both the installed helper and the module-local helper so Wi‑Fi updates from the UI run without prompting for a password. NetworkManager will persist the credentials in its own connection profile.

## Configuration
Add the module to `config/config.js`:
```js
{
    module: "MMM-WIFI",
    position: "bottom_right",
    config: {
        // defaults are tuned for the settings panel; override as needed
    }
}
```

### Key options (defaults)
| Option | Default | Description |
| ------ | ------- | ----------- |
| `updateInterval` | `30000` | Time in ms between ping checks |
| `maxTimeout` | `1000` | Timeout in ms for each ping |
| `animationSpeed` | `0` | Icon animation time in ms |
| `initialLoadDelay` | `5000` | Delay for the first ping |
| `server` | `8.8.8.8` | Host to ping |
| `thresholds` | `{ strong: 50, medium: 150, weak: 500 }` | Ping thresholds for strength |
| `allowWifiUpdates` | `true` | Allow Wi‑Fi updates from the UI |
| `settingsOnly` | `true` | Hide the DOM output; the module still broadcasts status to the settings panel |
| `wifiCommand` | `{ executable: "sudo", args: ["{modulePath}/scripts/update-wifi.sh", "{ssid}", "{password}"], timeout: 20000, maxBuffer: 1024 * 1024 }` | Command the helper executes when credentials are submitted; `{modulePath}` resolves to this module's directory |
| `useSudoForWifiCommand` | `true` | If `wifiCommand.executable` is not already `sudo`, wrap it with `sudo` |

### Updating Wi‑Fi from the mirror
When `allowWifiUpdates` is true, entering an SSID/password in the settings panel sends them to `node_helper`, which runs `/usr/local/sbin/mm-set-wifi.sh` via `sudo`. The helper turns Wi‑Fi on, rescans for networks, ensures a NetworkManager profile exists for the SSID (creating or updating it with the password), and then brings that profile up—even if the network was not visible in the initial scan (hidden networks and mobile hotspots are handled). Errors from `nmcli` are surfaced back to the UI; passwords are never logged.

### Bookworm specifics
- NetworkManager owns Wi‑Fi; do **not** edit `/etc/wpa_supplicant/wpa_supplicant.conf`.
- The provided helper assumes `nmcli` is present (default on Raspberry Pi OS Bookworm). If you customized networking, adjust `wifiCommand.args` accordingly.
- Sudo is scoped to `/usr/local/sbin/mm-set-wifi.sh` via `/etc/sudoers.d/magicmirror-wifi`.

## Troubleshooting
- **Permission denied / sudo prompt**: ensure the sudoers entry exists and matches the user running MorningMirror.
- **nmcli not found**: install NetworkManager (`sudo apt install network-manager`) or adjust `wifiCommand` to a different backend (e.g., `raspi-config nonint do_wifi_ssid_passphrase`).
- **Different user service**: if you run MorningMirror under `pi` (or a systemd service user), re-run the install snippet with `MIRROR_USER` set to that user so sudoers matches.
- **Command shows `{modulePath}/scripts/update-wifi.sh`**: upgrade to the latest module (or copy the updated `node_helper.js`) so the helper resolves `{modulePath}` to the module directory automatically—even if the placeholder was left untouched in your config.
