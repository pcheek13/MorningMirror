# MorningMirror

MorningMirror is a streamlined, modular smart mirror platform ready to clone and run on a Raspberry Pi 5.

## Raspberry Pi 5 one-shot setup (Bookworm)
Copy and paste this block on a clean Raspberry Pi 5. It installs Node 20, pulls the repo, installs runtime deps, sets up Wi‑Fi helper permissions, and registers MorningMirror with PM2 so it starts on boot. The block also prepares your desktop session so Electron has a display and PM2 inherits it on startup:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
  sudo apt update && sudo apt install -y git nodejs \
    libatk1.0-0 libatk-bridge2.0-0 libnss3 libgbm1 libx11-xcb1 libxcb-dri3-0 \
    libgtk-3-0 libasound2 libpangocairo-1.0-0 libatspi2.0-0 libdrm2 libxcomposite1 \
    libxdamage1 libxrandr2 && \
  git clone https://github.com/pcheek13/MorningMirror.git && \
  cd MorningMirror && \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev && \
  cp config/config.js.sample config/config.js && \
  MIRROR_USER="pcheek" && \
  sudo raspi-config nonint do_boot_behaviour B4 && \
  sudo raspi-config nonint do_wayland W1 && \
  cd modules/MMM-WIFI && \
  sudo install -m 0755 scripts/mm-set-wifi.sh /usr/local/sbin/mm-set-wifi.sh && \
  echo "${MIRROR_USER} ALL=(root) NOPASSWD: /usr/local/sbin/mm-set-wifi.sh" | sudo tee /etc/sudoers.d/morningmirror-wifi >/dev/null && \
  sudo chmod 440 /etc/sudoers.d/morningmirror-wifi && \
  cd ../../ && \
  sudo npm install -g pm2 && \
  DISPLAY=:0 XAUTHORITY=/home/${MIRROR_USER}/.Xauthority pm2 start npm --name morningmirror -- start && \
  pm2 save && \
  pm2 startup
```

What the extra lines do:
- `raspi-config nonint do_boot_behaviour B4` enables desktop auto-login so X/Wayland is running when MorningMirror starts.
- `raspi-config nonint do_wayland W1` keeps the default Wayland session active on Raspberry Pi OS Bookworm (Electron will fall back to X11 if it is not available).
- The `DISPLAY` and `XAUTHORITY` exports ensure PM2 inherits your display socket and Xauthority cookie when it spawns Electron. Keep the `MIRROR_USER` value aligned with the account that owns the repo.

Set your OpenWeatherMap API key before restarting the app:

```bash
export OPENWEATHERMAP_API_KEY="<your_api_key>" && pm2 restart morningmirror
```

## Manage PM2 auto start
Use these commands when you need to disable or re-enable PM2 boot startup for MorningMirror:

- Stop MorningMirror and remove it from PM2 auto start:
  ```bash
  pm2 stop morningmirror && pm2 delete morningmirror && pm2 unstartup
  ```
- Re-enable PM2 auto start (assumes the repo lives in `~/MorningMirror`):
  ```bash
  cd ~/MorningMirror && \
    pm2 start npm --name morningmirror -- start && \
    pm2 save && \
    pm2 startup
  ```

If `pm2 startup` prints a command, run it verbatim so systemd registers the service. Reboot once to confirm MorningMirror starts on its own.

## Desktop launcher (optional)
If you ever close Electron, copy the included desktop shortcut to your Pi so you can restart MorningMirror from the UI:

```bash
install -m 755 morningmirror.desktop ~/Desktop/ && \
  sed -i "s#/home/pcheek#${HOME}#g" ~/Desktop/morningmirror.desktop
```

Double-clicking the icon runs `npm run start:x11` from your cloned repo.

## Key features
- Modular layout with server and client components ready for custom modules, mirroring the familiar smart mirror scaffolding.
- Electron-powered shell for kiosk-style full-screen operation.
- Default modules preconfigured to work out of the box: MMM-DynamicWeather, MMM-DailyWeatherPrompt, a headless MMM-WIFI service that powers the settings Wi‑Fi indicator, clock, alert, update notification, compliments, and a touch-friendly hamburger launcher in the bottom-right corner.
- Settings drawer now includes per-module show/hide toggles that persist locally plus a built-in on-screen keyboard for every form field.
- Compliments wake greeting that borrows your configured profile name and shows for 25 seconds when the mirror wakes.
- Built-in auto sleep timer (15 minutes by default) and wake compliment toggle that are both adjustable from the on-screen settings and saved locally between sessions.
- Orientation toggle in the settings drawer that flips the UI between horizontal and portrait without touching Raspberry Pi display settings.
- One-tap MorningMirror updater in the settings drawer that runs `git pull` against the cloned repo so you can stay current without SSHing in.
- Development tooling (ESLint, Prettier, Jest, Stylelint) included for rapid module creation.

## Core dependencies
MorningMirror ships with a curated set of node modules to mirror the original experience and add modern conveniences:

- Runtime: Electron, Express, Socket.io, PM2
- UI/templating: Nunjucks, Handlebars
- Utilities: Moment & Moment-Timezone, Day.js, Suncalc, Croner, Envsub
- Diagnostics and logging: Console-stamp, Roarr, Shimmer
- Routing and middleware: Helmet plus built-in CIDR/IP whitelisting
- Front-end assets: Font Awesome, Animate.css, Weather Icons, Roboto fonts
- Quality tooling: ESLint, Stylelint, Prettier, Markdownlint, CSpell, Jest, Playwright

## Configuration
1. Copy `config/config.js.sample` to `config/config.js` (already done in the quick install block above; re-run if you need a clean slate):
   ```bash
   cp config/config.js.sample config/config.js
   ```
2. Update modules, API keys, or layout regions within `config/config.js` to suit your display. At minimum, set your OpenWeatherMap key:
   - Set `OPENWEATHERMAP_API_KEY` in your shell before starting PM2:
     ```bash
     export OPENWEATHERMAP_API_KEY="<your_api_key>"
     pm2 restart morningmirror
     ```
     or edit `MMM-DynamicWeather`’s `api_key` directly in `config/config.js`.
   - The default MMM-DynamicWeather block now reads the `OPENWEATHERMAP_API_KEY` environment variable automatically when MorningMirror runs under Node; if that variable is missing, the key stays blank so the browser never throws a `process is not defined` error. Set the variable before starting PM2 or edit `api_key` directly in the config file.
   - The sample clock config no longer uses the deprecated `secondsColor` option that triggered warnings in the log. To style seconds, target the CSS hooks in `modules/default/clock/clock_styles.css` (e.g., `.clock-second-digital` or `.clock-second`).
3. Restart MorningMirror to apply changes:
   ```bash
   pm2 restart morningmirror
   ```

The default configuration keeps the clock in the top center, MMM-DailyWeatherPrompt in the top-left, the compliments module in the middle-center region, and MMM-DynamicWeather rendering full-screen weather effects. A new MMM-HamburgerMenu floats in the `bottom_right` region with a three-line toggle that opens a compact panel for touch-friendly controls (including the Wi‑Fi indicator and credential update form). Set your OpenWeatherMap API key in `MMM-DynamicWeather` and optionally prefill `location` for `MMM-DailyWeatherPrompt` if you do not want the on-screen prompt.

When you enter a city/ZIP in the settings drawer, MMM-DailyWeatherPrompt geocodes it once and broadcasts the coordinates to every module listening for `LOCATION_COORDINATES`. The default build wires that signal into MMM-DynamicWeather (for animated backgrounds) and the clock so sunrise/sunset and the weather layers all stay in sync with the daily prompt.

Use the hamburger toggle to reveal shortcuts. The built-in settings gear broadcasts `OPEN_SETTINGS_PANEL` so any module listening for configuration updates can react, and the profile field lets you enter a name that saves locally and pushes `PROFILE_UPDATED` to the compliments module. Add more menu entries by extending `extraButtons` in the hamburger menu config without editing the module source.

The settings drawer now includes an adjustable auto sleep timer (enter 0 to disable) plus a checkbox that controls whether the compliments module shows its brief wake greeting. Both values are persisted locally so they survive refreshes and keep their state unless you wipe the browser storage or reimage the Pi.

Use the orientation picker to rotate MorningMirror between horizontal and portrait layouts instantly; the choice is stored locally and reapplied on reload without changing the Pi’s global display rotation.

Tap the update button to run a fast-forward `git pull` in your MorningMirror directory without leaving the touchscreen; the helper reports success or failure inline and keeps running even if the repo already matches origin.

The Wi‑Fi indicator now lives inside the settings panel: it shows strong/medium/weak states, flashes while credentials are updating, and switches to an empty red slash when the connection drops. MMM-WIFI’s node helper calls the NetworkManager helper via `sudo` so Bookworm systems can join networks without editing `/etc/wpa_supplicant/wpa_supplicant.conf`. The helper now rescans for networks, creates or updates a profile for the SSID, and attempts to bring it up even for hidden networks or mobile hotspots that are not visible on the first scan.

## On-device Wi‑Fi updates (system prep)
MorningMirror’s bundled MMM-WIFI module targets Raspberry Pi OS **Bookworm** with **NetworkManager** and uses `nmcli` to apply Wi‑Fi credentials safely. Run this single block after cloning so the helper script is installed and the MorningMirror user `pcheek` can execute it without a sudo prompt:

  ```bash
  MIRROR_USER="pcheek" && \
    cd ~/MorningMirror/modules/MMM-WIFI && \
    sudo install -m 0755 scripts/mm-set-wifi.sh /usr/local/sbin/mm-set-wifi.sh && \
    echo "${MIRROR_USER} ALL=(root) NOPASSWD: /usr/local/sbin/mm-set-wifi.sh" | sudo tee /etc/sudoers.d/morningmirror-wifi >/dev/null && \
    sudo chmod 440 /etc/sudoers.d/morningmirror-wifi
  ```

What this does:
- Installs the `nmcli`-based helper at `/usr/local/sbin/mm-set-wifi.sh` with the correct permissions.
- Grants a tightly scoped sudo rule so the MorningMirror process can call only that script without a password prompt.
- Keeps NetworkManager in control—no edits to `/etc/wpa_supplicant/wpa_supplicant.conf` are required on Bookworm.

## Troubleshooting common install errors
- **`node: bad option: --run` when running `npm start`**: Older Node releases on Raspberry Pi OS do not ship with the experimental `--run` flag. The start scripts now call Electron directly; pull the latest changes and rerun `npm ci --omit=dev`.
- **`Electron failed to install correctly, please delete node_modules/electron and try installing again`**: This happens when `ELECTRON_SKIP_BINARY_DOWNLOAD=1` is set or the download was interrupted. Fix it by removing Electron and reinstalling dependencies so the binary downloads:
  ```bash
  rm -rf node_modules/electron ~/.cache/electron && \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev
  ```
- **`error while loading shared libraries: libatk-1.0.so.0` (or similar) when running `npm start`**: Install the Chromium/Electron runtime dependencies and rerun the start command:
  ```bash
  sudo apt update && sudo apt install -y \
    libatk1.0-0 libatk-bridge2.0-0 libnss3 libgbm1 libx11-xcb1 libxcb-dri3-0 \
    libgtk-3-0 libasound2 libpangocairo-1.0-0 libatspi2.0-0 libdrm2 libxcomposite1 \
    libxdamage1 libxrandr2
  ```
- **Electron exits with signal `SIGTRAP` right after `npm start`**: The display server is usually missing. The start script already searches for Wayland first (`wayland-1`) and falls back to X11 (`:0`); if neither socket exists, start a graphical session or set the variable manually, then rerun `npm start`.
- **`Display is set but no X11 socket was found at /tmp/.X11-unix/X0`**: The DISPLAY variable points to X11 but no desktop session is running. Fix it by enabling desktop auto-login, rebooting, and letting PM2 inherit the display variables:
  ```bash
  sudo raspi-config nonint do_boot_behaviour B4 && sudo reboot
  # after reboot, a desktop session will create /tmp/.X11-unix/X0
  cd ~/MorningMirror
  export DISPLAY=:0
  export XAUTHORITY=/home/pcheek/.Xauthority   # replace with your user if different
  pm2 restart morningmirror
  ```
  If you are testing from SSH without a desktop session, unset the display so Electron skips launching: `unset DISPLAY && npm start`.
- **Electron exits with `Trace/breakpoint trap` on Raspberry Pi 5**: This happens when Electron cannot talk to a running Wayland/X11 session. Enable desktop auto-login, reboot once, and ensure PM2 sees the display variables:
  ```bash
  sudo raspi-config nonint do_boot_behaviour B4 && sudo raspi-config nonint do_wayland W1 && sudo reboot
  # after reboot
  cd ~/MorningMirror
  export DISPLAY=:0
  export XAUTHORITY=/home/pcheek/.Xauthority
  pm2 restart morningmirror
  ```
  If you use a different account, replace `/home/pcheek` with that user’s home path.
- **`Cannot access 'config' before initialization` when starting Electron**: Update your config to the latest format by copying the sample again. Any customizations can be re-applied afterward:
  ```bash
  cd ~/MorningMirror && \
    cp config/config.js.sample config/config.js && \
    npm start
  ```
- **PM2 stuck in `stopped` state**: Ensure PM2 is using the npm script (`pm2 start npm --name morningmirror -- start`) and that your display server is available (`DISPLAY=:0` for X11 or `WAYLAND_DISPLAY=wayland-1` for Wayland).
## Contributing
Issues and pull requests are welcome at [github.com/pcheek13/MorningMirror](https://github.com/pcheek13/MorningMirror). Keep changes small, add tests where possible, and follow the included linting tools before committing.

## License
MorningMirror is released under the MIT license. See `LICENSE.md` for details.
