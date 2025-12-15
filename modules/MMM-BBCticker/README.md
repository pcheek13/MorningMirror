# MMM-BBCticker

A MagicMirror² module that shows the latest BBC World News headlines as a smooth scrolling ticker, perfect for the bottom bar of your smart mirror display.

## Features

- Pulls live headlines from the official BBC World News RSS feed (configurable)
- Animated ticker presentation inspired by TV news crawlers
- Configurable refresh interval, animation speed, colors, and maximum items
- Automatic retry handling with graceful error messages when the BBC feed is temporarily unavailable
- Lightweight networking stack with no external runtime dependencies—ideal for Raspberry Pi 5 deployments

## Installation

Run the following commands on your Raspberry Pi (or any device hosting MagicMirror²) to clone and prepare the module in one step:

```bash
cd ~/MagicMirror/modules && \
  git clone https://github.com/pcheek13/MMM-BBCticker.git && \
  cd MMM-BBCticker && \
  npm install
```

## MagicMirror Configuration

Add the module to the `modules` array in your `config/config.js` file:

```javascript
{
  module: "MMM-BBCticker",
  position: "bottom_bar",
  config: {
    header: "World Headlines",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    updateInterval: 5 * 60 * 1000,
    tickerSpeed: 40,
    maxItems: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    textColor: "#f5f5f5",
    fontSize: "1.5rem"
  }
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `header` | `BBC World News` | Optional title to display above the ticker. |
| `feedUrl` | `https://feeds.bbci.co.uk/news/world/rss.xml` | RSS feed to parse. Any valid RSS/Atom feed can be used. |
| `updateInterval` | `10 * 60 * 1000` | Frequency (in milliseconds) to refresh the feed. Minimum enforced at 60 seconds. |
| `tickerSpeed` | `45` | Duration (in seconds) for one full ticker cycle. Smaller numbers scroll faster. |
| `animationSpeed` | `1000` | DOM update animation speed in milliseconds. |
| `maxItems` | `10` | Maximum number of headlines to include in the ticker. |
| `separator` | `•` | Text string shown between headlines. |
| `backgroundColor` | `rgba(0, 0, 0, 0.6)` | Background color for the ticker bar. Set to `null` for transparent. |
| `textColor` | `#ffffff` | Color of the headline text. |
| `fontSize` | `1.4rem` | Font size for the ticker text. |
| `reloadOnSuspend` | `true` | When the module resumes from suspend, automatically refetch the feed. |

## Development

- `MMM-BBCticker.js`: Front-end module logic and ticker rendering
- `node_helper.js`: Backend helper that fetches and parses the RSS feed using native Node.js networking utilities
- `MMM-BBCticker.css`: Ticker styling and animation rules
- `translations/en.json`: English language strings (extendable for localization)

### Running Locally

MagicMirror modules are meant to run inside the MagicMirror application. To test locally, start MagicMirror with:

```bash
npm run start
```

or, for server-only mode on a headless Raspberry Pi:

```bash
npm run server
```

Then load your MagicMirror interface in a browser or Electron window. This module is optimized for placement in the `bottom_bar` region to achieve the classic ticker effect.

## Troubleshooting

- **No headlines shown**: Verify internet connectivity and that the BBC RSS feed is accessible from your network.
- **Ticker stuttering**: Increase the `tickerSpeed` value or reduce `maxItems` to lighten the workload on low-powered devices.
- **Styling conflicts**: Adjust `backgroundColor`, `textColor`, or override styles in `custom.css` if you need to blend with your overall theme.

## License

MMM-BBCticker is released under the [MIT License](LICENSE).
