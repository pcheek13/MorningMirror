# MMM-HamburgerMenu

An always-visible bottom bar for MorningMirror. It anchors to the bottom of the UI, exposes a sleep toggle to turn the display off/on, includes inline Wi-Fi credentials for MMM-WIFI, and keeps a profile field that pushes the user's name to the `compliments` module.

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
    extraButtons: []
  }
}
```

## Features
- Always-visible linear bar anchored to the bottom of the display so items stay within screen bounds.
- "Sleep" button toggles the mirror display off/on while keeping the bar visible and dispatching `MIRROR_SLEEP`/`MIRROR_WAKE` to interested modules.
- Inline Wi-Fi credential form forwards SSID/password to MMM-WIFI via `WIFI_CREDENTIALS_UPDATED`.
- Profile field saves locally and broadcasts `PROFILE_UPDATED` for `compliments`.
- `extraButtons` array lets you add more menu actions without editing the module source.
