# MorningMirror

MorningMirror is a streamlined, modular smart mirror platform ready to clone and run on a Raspberry Pi 5. The project keeps the familiar Magic Mirror experience while simplifying setup, trimming legacy references, and bundling the essentials you need to get a display running quickly.

## Quick install (Raspberry Pi 5)
Copy and paste this single block on a clean Raspberry Pi 5 to install Node 20 directly from NodeSource (avoids the `nodejs`/`npm` conflict seen with Debian packages), clone MorningMirror, install dependencies, copy the sample config, and start it with PM2 for boot persistence:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
  sudo apt update && sudo apt install -y git nodejs && \
  git clone https://github.com/pcheek13/MorningMirror.git && \
  cd MorningMirror && \
  ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install && \
  cp config/config.js.sample config/config.js && \
  sudo npm install -g pm2 && \
  pm2 start js/electron.js --name morningmirror && \
  pm2 save && \
  pm2 startup
```

> **Why the previous one-liner failed:** Raspberry Pi OS (Bookworm) ships an `npm` package that conflicts with the NodeSource `nodejs` package (`nodejs` already bundles npm). Installing both in a single apt command triggers "unmet dependencies". The updated command installs only `nodejs` from NodeSource—which includes npm—eliminating the conflict.

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

## Contributing
Issues and pull requests are welcome at [github.com/pcheek13/MorningMirror](https://github.com/pcheek13/MorningMirror). Keep changes small, add tests where possible, and follow the included linting tools before committing.

## License
MorningMirror is released under the MIT license. See `LICENSE.md` for details.
