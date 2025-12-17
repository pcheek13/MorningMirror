# MMM-HamburgerMenu

A lightweight hamburger launcher anchored to the bottom-right corner of MorningMirror. It exposes a settings gear plus a profile field so you can push the user's name to the `compliments` module, and it is ready for additional custom buttons.

## Installation
This repository already includes the module. Add it to your `config/config.js` and restart MorningMirror:

```js
{
  module: "MMM-HamburgerMenu",
  position: "bottom_right",
  config: {
    menuLabel: "Menu",
    settingsLabel: "Settings",
    profilePlaceholder: "Enter your name",
    saveProfileLabel: "Save",
    extraButtons: [
      // { label: "Reboot", icon: "power-off", notification: "SYSTEM_REBOOT" }
    ]
  }
}
```

## Features
- Floating bottom-right hamburger toggle styled for touch.
- Settings gear dispatches `OPEN_SETTINGS_PANEL` so other modules can listen for it.
- Profile field saves locally and broadcasts `PROFILE_UPDATED` for `compliments`.
- `extraButtons` array lets you add more menu actions without editing the module source.
