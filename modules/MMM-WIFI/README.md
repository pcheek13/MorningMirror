# MMM-WIFI

Display a solid Wi‑Fi logo as network signal for MorningMirror (and MorningMirror forks) and tap it to reconfigure your Wi‑Fi directly from the mirror. The default refresh cadence is tuned to 30 seconds with no fade animation to keep the icon steady instead of blinking. MorningMirror now ships the module in `settingsOnly` mode so it can broadcast signal quality and update status into the settings panel without rendering a standalone icon on the screen.

![Signal icons: none, weak, normal, strong, loading](https://raw.githubusercontent.com/pcheek13/MMM-WIFI/master/icons.gif)

## Dependencies

-   [MorningMirror](https://github.com/MichMich/MorningMirror) (works on Raspberry Pi 5; MorningMirror forks also work)
-   [NPM Ping](https://www.npmjs.com/package/ping)

## Installation (one copy/paste block)
On your Pi, paste the following into the terminal to install the module, its dependencies, and ensure the bundled Wi‑Fi helper is executable:
```bash
cd ~/MorningMirror/modules && \
git clone https://github.com/pcheek13/MMM-WIFI.git && \
cd MMM-WIFI && \
npm install && \
chmod +x scripts/update-wifi.sh
```
## Configuration
- Now use your editor `nano` or `vim` to edit the following file
```bash
nano ~/MorningMirror/config/config.js # change nano to your favorite editor
```
- Paste the following code into the `modules` section

```js
{
    module: "MMM-WIFI",
    position: "bottom_right",
    config: {
        // Configuration of the module goes here
    }
}
```

## Configuration Options

| **Option**         | **Default**                              | **Description**                         |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| `updateInterval`   | `30000`                                  | Time in ms between connection tests     |
| `maxTimeout`       | `1000`                                   | Maximum timeout in ms for every pings   |
| `animationSpeed`   | `0`                                      | Icon change animation time in ms        |
| `initialLoadDelay` | `5000`                                   | Delay in ms for first ping              |
| `server`           | `8.8.8.8`                                | Pingable server IP address              |
| `thresholds`       | `{ strong: 50, medium: 150, weak: 500 }` | Tresholds for icons (ping answer in ms) |
| `showMessage`      | `true`                                   | Shows status messages depending on how good or bad is the connection |
| `flexDirection`    | `row`                                    | Sets the direction the module is displayed; `row` displays the row in left-to-right mode (default), `row-reverse` displays the row in right-to-left mode. |
| `scale`            | `0.45`                                   | How much to scale the ping icon. Must be greater than 0. |
| `touchTargetSize`  | `96`                                     | Minimum square size (px) of the tap target around the Wi‑Fi icon for easier touchscreen interaction. |
| `allowWifiUpdates` | `true`                                   | When enabled, tapping the Wi‑Fi icon on a touchscreen toggles a form to enter a new SSID and password. |
| `showVirtualKeyboard` | `true`                                | Displays a built-in on-screen keyboard beneath the form so you can type SSID and password without a hardware keyboard. |
| `wifiCommand`      | `/bin/bash {modulePath}/scripts/update-wifi.sh {ssid} {password}` | Command executed to update Wi‑Fi (defaults to the provided shell script in this module’s folder). Customize if your Pi uses a different path or interface name. |
| `useSudoForWifiCommand` | `true`                              | Run the Wi‑Fi command with `sudo`. Disable only if your MorningMirror user already has permission to manage networking. |

### Updating Wi‑Fi from the mirror

When `allowWifiUpdates` is true, simply tap or click the enlarged Wi‑Fi strength icon (the whole padded square is clickable and also supports keyboard Enter/Space). The button is pointer-enabled from the moment the module loads, and the form will stay put while you type (inputs are preserved even as the signal status updates in the background). Submitting the form triggers the provided shell script (or your custom command) to rebuild `/etc/wpa_supplicant/wpa_supplicant.conf` so it contains only the new network, reconfigure Wi‑Fi, and restart MorningMirror with pm2. Any errors returned by the command will be shown under the form.

### Custom Wi‑Fi script (default)

This module ships with `scripts/update-wifi.sh`, which:

- Backs up `/etc/wpa_supplicant/wpa_supplicant.conf`
- Uses `wpa_passphrase` to create a secure network block for your SSID/password
- Removes any existing `network={...}` blocks so the new credentials become the only active Wi‑Fi profile (no more silently reconnecting to an old SSID)
- Reconfigures Wi‑Fi and restarts MorningMirror via pm2 (default process name `morningmirror`; override with `PM2_PROCESS_NAME`)

If you need to recreate or inspect the helper, follow these explicit steps on your Raspberry Pi (all commands are copy/paste ready):

1. Move into the module folder and create the script file with the full contents:

```bash
cd ~/MorningMirror/modules/MMM-WIFI
cat <<'EOF' > scripts/update-wifi.sh
#!/bin/bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

SSID="$1"
PASSWORD="$2"
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
WPA_INTERFACE="${WPA_INTERFACE:-wlan0}"
BACKUP_SUFFIX=$(date +%Y%m%d%H%M%S)
BACKUP_PATH="${WPA_CONF}.${BACKUP_SUFFIX}.bak"
TMP_NETWORK=$(mktemp)
TMP_CONF=$(mktemp)

cleanup() {
  rm -f "$TMP_NETWORK" "$TMP_CONF"
}

trap cleanup EXIT

# Ensure the configuration file exists and is writable
sudo install -d -m 755 /etc/wpa_supplicant
if [[ ! -f "$WPA_CONF" ]]; then
  echo "Creating missing $WPA_CONF with defaults"
  sudo tee "$WPA_CONF" >/dev/null <<'CFG'
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US
CFG
fi

# Create a hashed network block from the provided credentials
if ! command -v wpa_passphrase >/dev/null 2>&1; then
  echo "wpa_passphrase command not found. Please install wpa_supplicant." >&2
  exit 2
fi

wpa_passphrase "$SSID" "$PASSWORD" > "$TMP_NETWORK"

# Backup existing configuration and rebuild the file with only the new network
sudo cp "$WPA_CONF" "$BACKUP_PATH"

# Strip all existing network blocks so the new credentials become the only active Wi-Fi profile
sudo awk '
  /^\s*network\s*=\s*\{/ { in_network = 1; next }
  in_network {
    if ($0 ~ /^\s*\}/) { in_network = 0 }
    next
  }
  { print }
' "$WPA_CONF" | sudo tee "$TMP_CONF" >/dev/null

if [[ ! -s "$TMP_CONF" ]]; then
  COUNTRY_LINE=$(grep -m1 '^country=' "$WPA_CONF" 2>/dev/null || echo "country=US")
  cat <<CFG | sudo tee "$TMP_CONF" >/dev/null
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
${COUNTRY_LINE}
CFG
fi

{
  echo "# Added by MMM-WIFI on $(date)"
  cat "$TMP_NETWORK"
} | sudo tee -a "$TMP_CONF" >/dev/null

sudo install -m 600 "$TMP_CONF" "$WPA_CONF"

# Reconfigure Wi-Fi and restart MorningMirror
if ! timeout 15s sudo wpa_cli -i "$WPA_INTERFACE" reconfigure; then
  echo "wpa_cli reconfigure failed or timed out; restarting wpa_supplicant" >&2
  sudo systemctl restart wpa_supplicant.service
fi

PM2_PROCESS_NAME=${PM2_PROCESS_NAME:-morningmirror}
if command -v pm2 >/dev/null 2>&1; then
  if sudo pm2 describe "$PM2_PROCESS_NAME" >/dev/null 2>&1; then
    sudo pm2 restart "$PM2_PROCESS_NAME" --update-env || \\
      echo "Warning: pm2 restart failed; restart MorningMirror manually" >&2
  else
    echo "Warning: pm2 process '$PM2_PROCESS_NAME' not found. Start MorningMirror with pm2 or set PM2_PROCESS_NAME." >&2
  fi
else
  echo "Warning: pm2 not installed; restart MorningMirror manually after updating Wi-Fi." >&2
fi

echo "Wi-Fi credentials for '$SSID' applied. Backup saved to $BACKUP_PATH"
EOF
```

2. Make it executable so MorningMirror can run it, and (optionally) test it immediately. You can copy/paste this block from the repository root on your Pi (replace `YourSSID`/`YourPassword` with real credentials or drop the last line if you only want to set permissions):

```bash
cd ~/MorningMirror/modules/MMM-WIFI && \
  chmod +x scripts/update-wifi.sh && \
  sudo /bin/bash ./scripts/update-wifi.sh "YourSSID" "YourPassword"
```

3. Ensure `wifiCommand` in your `config.js` points to this script. The default now uses `{modulePath}` so the module automatically resolves its own folder (for example, `/home/pi/MorningMirror/modules/MMM-WIFI/scripts/update-wifi.sh`) and runs it with `sudo` when `useSudoForWifiCommand` is `true`.

> **Troubleshooting `cp: cannot stat '/etc/wpa_supplicant/wpa_supplicant.conf'`**
>
> If your Pi shows this error, the configuration file has never been created. The updated helper above now creates `/etc/wpa_supplicant/wpa_supplicant.conf` with safe defaults before backing it up and rebuilding it with your network, so rerunning the command should succeed. If you prefer to prepare it manually, run:
>
> ```bash
> sudo install -d -m 755 /etc/wpa_supplicant
> sudo tee /etc/wpa_supplicant/wpa_supplicant.conf >/dev/null <<'CFG'
> ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
> update_config=1
> country=US
> CFG
> ```

> **Troubleshooting pm2 errors (`process or namespace morningmirror not found` / `Use --update-env to update environment variables`)**
>
> The helper restarts MorningMirror with pm2 using the process name in `PM2_PROCESS_NAME` (defaults to `morningmirror` to match the main installation snippet). If you see either error above, ensure MorningMirror is running under pm2 and named correctly:
>
> ```bash
> pm2 list                                 # confirm the process name
> pm2 start js/electron.js --name morningmirror  # or use your existing start command/name
> export PM2_PROCESS_NAME=morningmirror    # set to your process name if different
> ```
>
> The script already uses `--update-env` during restart; the error simply means pm2 could not find a process with the expected name. Set the name, export `PM2_PROCESS_NAME`, and rerun the Wi‑Fi update.
