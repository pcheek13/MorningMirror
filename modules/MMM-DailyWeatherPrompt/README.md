# MMM-DailyWeatherPrompt

MagicMirror² module that displays **today’s weather** and allows you to **set or change the weather location directly on the mirror**. If no location is configured, the module renders a simple on-screen prompt (city/state or ZIP). The chosen location is saved locally and reused on reboot.

## Features

- On-screen location prompt (no config edit required)
- Touch keypad with ZIP entry and letter toggle for city names
- Accepts **City, ST** or **ZIP code**
- Daily weather summary (current, high, low) plus a 5-day outlook
- Feels-like temperature, humidity, and wind
- Persistent storage via `localStorage`
- Edit location anytime with a small gear button along the bottom of the module
- Clean, mirror-friendly UI

## One-line install (copy/paste)

Run this on your Raspberry Pi (or any MagicMirror host):

```bash
cd ~/MagicMirror/modules \
  && git clone https://github.com/pcheek13/MMM-DailyWeatherPrompt.git \
  && cd MMM-DailyWeatherPrompt \
  && npm install
```

## Configuration

Add the module to your `config.js`:

```js
{
  module: "MMM-DailyWeatherPrompt",
  position: "top_left", // choose any MagicMirror position
  config: {
    units: "imperial", // or "metric"
    updateInterval: 10 * 60 * 1000, // 10 minutes
    promptText: "Enter City, ST or ZIP",
    showFeelsLike: true,
    showHumidity: true,
    showWind: true,
    allowLocationChange: true
  }
}
```

### Notes
- The module uses the free [Open-Meteo](https://open-meteo.com/) APIs (geocoding + current forecast). No API key required.
- If `config.location` is empty, the module will prompt on-screen. The chosen value is saved to `localStorage` on the client.
- `units` follows Open-Meteo options: `imperial` for °F/mph, `metric` for °C/km/h.

## Interaction

1. On first load (no location configured), the module displays an input prompt.
2. Enter `City, ST` or a ZIP/postal code and click **Save** (or press **Enter**).
3. Use the on-screen keypad: **ZIP** mode defaults to numbers, and the **Letters** toggle switches to city input. You can still type with a physical keyboard.
4. Click **Save** to fetch weather data (current temp, summary, high/low, feels-like, humidity, wind, and the last updated time) plus a 5-day forecast.
5. Tap the gear at the bottom of the module to re-open the location prompt and save a new city/ZIP whenever you move your mirror.

## File overview

- `MMM-DailyWeatherPrompt.js` – front-end module UI, prompt handling, and socket messaging
- `node_helper.js` – server-side fetch to Open-Meteo
- `MMM-DailyWeatherPrompt.css` – styling
- `package.json` – dependencies (`node-fetch` for API calls)

## License

MIT
