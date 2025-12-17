# MMM-HamburgerMenu

An always-visible bottom-right control for MorningMirror. It keeps the sleep toggle and settings gear visible (icon-only to save space) and opens a compact settings tray with Wi-Fi credentials (for MMM-WIFI), a profile name field (for `compliments`), and the `MMM-DailyWeatherPrompt` location.

## Installation (copy/paste ready for Raspberry Pi)
This repository already includes the module. From your MagicMirror installation, clone/update MorningMirror and install dependencies in one go:

```bash
cd ~/MagicMirror/modules \
  && git clone https://github.com/your-org/MorningMirror.git || (cd MorningMirror && git pull) \
  && cd MorningMirror \
  && npm install
```

Then reference it inside `config/config.js`:

```js
{ 
  module: "MMM-HamburgerMenu",
  position: "bottom_right",
  config: {
    settingsLabel: "Settings",
    profilePlaceholder: "Enter your name",
    saveProfileLabel: "Save",
    sleepLabel: "Sleep",
    wakeLabel: "Wake",
    wifiLabel: "Wi-Fi",
    wifiSsidPlaceholder: "Network name (SSID)",
    wifiPasswordPlaceholder: "Wi-Fi password",
    wifiSaveLabel: "Update Wi-Fi",
    locationLabel: "Daily weather location",
    locationPlaceholder: "City, ST or ZIP",
    locationSaveLabel: "Save location",
    extraButtons: []
  }
}
```

## Features
- Icon-only sleep and settings controls keep the visible bar tiny while staying tappable.
- A slide-down settings tray now contains Wi-Fi (MMM-WIFI), profile name (for `compliments`), and the `MMM-DailyWeatherPrompt` location field.
- Sleep button toggles the mirror display off/on while dispatching `MIRROR_SLEEP`/`MIRROR_WAKE` to interested modules.
- Profile field saves locally and broadcasts `PROFILE_UPDATED` so compliments replace `{name}` placeholders with your saved name.
- Module toggles for every default module (clock, weather, Wi-Fi, etc.) are saved locally so you can hide or re-enable modules with a tap.
- Built-in on-screen keyboard keeps every input touch-friendly on kiosk builds.
- The settings button hides itself while sleeping to leave only the half-moon wake control visible.
- `extraButtons` array still lets you add more menu actions without editing the module source.
