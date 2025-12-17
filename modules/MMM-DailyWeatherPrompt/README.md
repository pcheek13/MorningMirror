# MMM-DailyWeatherPrompt

MorningMirror module that displays **today’s weather** using the location saved in the MMM-HamburgerMenu settings tray. The chosen city/state or ZIP lives in `localStorage` so the forecast stays in sync after a reboot.

## Features

- Location edited in the MMM-HamburgerMenu settings tray (no on-screen keypad clutter)
- Accepts **City, ST** or **ZIP code**
- Daily weather summary (current, high, low) plus a 5-day outlook
- Feels-like temperature, humidity, and wind
- Persistent storage via `localStorage`
- Clean, mirror-friendly UI

## One-line install (copy/paste)

Run this on your Raspberry Pi (or any MorningMirror host):

```bash
cd ~/MorningMirror/modules \
  && git clone https://github.com/pcheek13/MMM-DailyWeatherPrompt.git \
  && cd MMM-DailyWeatherPrompt \
  && npm install
```

## Configuration

Add the module to your `config.js`:

```js
{
  module: "MMM-DailyWeatherPrompt",
  position: "top_left", // choose any MorningMirror position
  config: {
    units: "imperial", // or "metric"
    updateInterval: 10 * 60 * 1000, // 10 minutes
    showFeelsLike: true,
    showHumidity: true,
    showWind: true
  }
}
```

### Notes
- The module uses the free [Open-Meteo](https://open-meteo.com/) APIs (geocoding + current forecast). No API key required.
- Set or change the location in the MMM-HamburgerMenu settings tray; the module listens for `LOCATION_UPDATED` and refreshes automatically.
- `units` follows Open-Meteo options: `imperial` for °F/mph, `metric` for °C/km/h.

## Interaction

1. Open the MMM-HamburgerMenu settings tray (bottom-right gear) and enter `City, ST` or a ZIP/postal code.
2. The module receives the `LOCATION_UPDATED` notification, saves the value locally, and fetches weather data (current temp, summary, high/low, feels-like, humidity, wind, and the last updated time) plus a 5-day forecast.

## File overview

- `MMM-DailyWeatherPrompt.js` – front-end module UI, prompt handling, and socket messaging
- `node_helper.js` – server-side fetch to Open-Meteo
- `MMM-DailyWeatherPrompt.css` – styling
- `package.json` – dependencies (`node-fetch` for API calls)

## License

MIT
