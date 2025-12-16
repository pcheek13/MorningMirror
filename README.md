# MorningMirror

MorningMirror is a streamlined, modular smart mirror platform ready to clone and run on a Raspberry Pi 5. The project keeps the familiar Magic Mirror experience while simplifying setup, trimming legacy references, and bundling the essentials you need to get a display running quickly.

## Quick install (Raspberry Pi 5)
Copy and paste this single block on a clean Raspberry Pi 5 to clone MorningMirror, install dependencies, copy the sample config,
and start it with PM2 for boot persistence:

```bash
sudo apt update && sudo apt install -y git nodejs npm && \
  git clone https://github.com/pcheek13/MorningMirror.git && \
  cd MorningMirror && \
  npm install && \
  cp config/config.js.sample config/config.js && \
  npm install -g pm2 && \
  pm2 start js/electron.js --name morningmirror && \
  pm2 save && \
  pm2 startup
```

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
- Routing and middleware: Express-IPFilter, Helmet, Router
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
