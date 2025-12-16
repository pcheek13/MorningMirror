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

## Key features
- Modular layout with server and client components ready for custom modules, mirroring the familiar Magic Mirror scaffolding.
- Electron-powered shell for kiosk-style full-screen operation.
- Default modules (clock, calendar, weather, news) preconfigured to work out of the box.
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
3. Restart MorningMirror to apply changes (`npm run start:x11` or restart the PM2 process).

## Troubleshooting common install errors
- **`node: bad option: --run` when running `npm start`**: Older Node releases on Raspberry Pi OS do not ship with the experimental `--run` flag. The start scripts now call Electron directly; pull the latest changes and rerun `npm ci --omit=dev`.
- **`Electron failed to install correctly, please delete node_modules/electron and try installing again`**: This happens when `ELECTRON_SKIP_BINARY_DOWNLOAD=1` is set or the download was interrupted. Fix it by removing Electron and reinstalling dependencies so the binary downloads:
  ```bash
  rm -rf node_modules/electron ~/.cache/electron && \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev
  ```
- **PM2 stuck in `stopped` state**: Ensure PM2 is using the npm script (`pm2 start npm --name morningmirror -- start`) and that your display server is available (`DISPLAY=:0` for X11 or `WAYLAND_DISPLAY=wayland-1` for Wayland).

## Contributing
Issues and pull requests are welcome at [github.com/pcheek13/MorningMirror](https://github.com/pcheek13/MorningMirror). Keep changes small, add tests where possible, and follow the included linting tools before committing.

## License
MorningMirror is released under the MIT license. See `LICENSE.md` for details.
