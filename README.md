# MorningMirror

MorningMirror is a streamlined, modular smart mirror platform ready to clone and run on a Raspberry Pi 5. The project keeps the familiar Magic Mirror experience while simplifying setup, trimming legacy references, and bundling the essentials you need to get a display running quickly.

## Quick install (Raspberry Pi 5)
Copy and paste this single block on a clean Raspberry Pi 5 to install Node 20 from NodeSource, clone MorningMirror, install production dependencies (including Electron), copy the sample config, and start it with PM2 for boot persistence:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
  sudo apt update && sudo apt install -y git nodejs && \
  git clone https://github.com/pcheek13/MorningMirror.git && \
  cd MorningMirror && \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev && \
  cp config/config.js.sample config/config.js && \
  sudo npm install -g pm2 && \
  pm2 start npm --name morningmirror -- start && \
  pm2 save && \
  pm2 startup
```

The `npm ci --omit=dev` step installs only the runtime dependencies (Electron included) to keep downloads lean on the Pi. Removing `ELECTRON_SKIP_BINARY_DOWNLOAD` ensures Electron actually downloads its platform binary so the app can start.

If PM2 prints a `pm2 startup ...` command, run it exactly as shown to register the service with systemd. After a reboot, the `morningmirror` process will start automatically.

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

## Key features
- Modular layout with server and client components ready for custom modules, mirroring the familiar Magic Mirror scaffolding.
- Electron-powered shell for kiosk-style full-screen operation.
- Default modules preconfigured to work out of the box: MMM-DynamicWeather, MMM-DailyWeatherPrompt, MMM-WIFI, clock, alert, update notification, compliments, and a touch-friendly hamburger launcher in the bottom-right corner.
- Compliments wake greeting that borrows your configured profile name and shows for 25 seconds when the mirror wakes.
- Built-in auto sleep timer (15 minutes by default) and wake compliment toggle that are both adjustable from the on-screen settings and saved locally between sessions.
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
1. Copy `config/config.js.sample` to `config/config.js`:
   ```bash
   cp config/config.js.sample config/config.js
   ```
2. Update modules, API keys, or layout regions within `config/config.js` to suit your display.
   - The default MMM-DynamicWeather block now reads the `OPENWEATHERMAP_API_KEY` environment variable automatically when MorningMirror runs under Node; if that variable is missing, the key stays blank so the browser never throws a `process is not defined` error. Set the variable before starting PM2 or edit `api_key` directly in the config file.
3. Restart MorningMirror to apply changes (`npm run start:x11` or restart the PM2 process).

The default configuration keeps the clock in the top center, MMM-DailyWeatherPrompt in the top-left, the lightweight MMM-WIFI indicator in the top-right, the compliments module in the middle-center region, and MMM-DynamicWeather rendering full-screen weather effects. A new MMM-HamburgerMenu floats in the `bottom_right` region with a three-line toggle that opens a compact panel for touch-friendly controls. Set your OpenWeatherMap API key in `MMM-DynamicWeather` and optionally prefill `location` for `MMM-DailyWeatherPrompt` if you do not want the on-screen prompt.

Use the hamburger toggle to reveal shortcuts. The built-in settings gear broadcasts `OPEN_SETTINGS_PANEL` so any module listening for configuration updates can react, and the profile field lets you enter a name that saves locally and pushes `PROFILE_UPDATED` to the compliments module. Add more menu entries by extending `extraButtons` in the hamburger menu config without editing the module source.

The settings drawer now includes an adjustable auto sleep timer (enter 0 to disable) plus a checkbox that controls whether the compliments module shows its brief wake greeting. Both values are persisted locally so they survive refreshes and keep their state unless you wipe the browser storage or reimage the Pi.

The Wi-Fi indicator automatically appears for 30 seconds after boot or wake and stays visible whenever the connection is weak or missing, disappearing on its own once the link looks healthy.

MMM-WIFI now resolves its helper script using `{modulePath}` and ships with the executable bit set, so the Wi‑Fi update button can call `scripts/update-wifi.sh` without hitting "no such file" errors on fresh Raspberry Pi installs.

## Troubleshooting common install errors
- **`node: bad option: --run` when running `npm start`**: Older Node releases on Raspberry Pi OS do not ship with the experimental `--run` flag. The start scripts now call Electron directly; pull the latest changes and rerun `npm ci --omit=dev`.
- **`Electron failed to install correctly, please delete node_modules/electron and try installing again`**: This happens when `ELECTRON_SKIP_BINARY_DOWNLOAD=1` is set or the download was interrupted. Fix it by removing Electron and reinstalling dependencies so the binary downloads:
  ```bash
  rm -rf node_modules/electron ~/.cache/electron && \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev
  ```
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
