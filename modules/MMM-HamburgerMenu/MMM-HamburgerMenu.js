/* global Module, MM, Log */

Module.register("MMM-HamburgerMenu", {
  defaults: {
    settingsLabel: "Settings",
    profilePlaceholder: "Enter your name",
    saveProfileLabel: "Save",
    sleepLabel: "Sleep",
    wakeLabel: "Wake",
    sleepTimerLabel: "Auto sleep after (minutes)",
    sleepTimerHelper: "Set to 0 to keep the mirror awake",
    sleepSaveLabel: "Save sleep timer",
    wifiLabel: "Wi-Fi",
    wifiSsidPlaceholder: "Network name (SSID)",
    wifiPasswordPlaceholder: "Wi-Fi password",
    wifiSaveLabel: "Update Wi-Fi",
    locationLabel: "Daily weather location",
    locationPlaceholder: "City, ST or ZIP",
    locationSaveLabel: "Save location",
    complimentsToggleLabel: "Show compliments when waking",
    complimentsToggleHelper: "Controls the initial wake greeting",
    modulesLabel: "Modules",
    modulesHelper: "Toggle any default module on or off. Changes stay saved until you re-enable them.",
    autoSleepMinutes: 15,
    showComplimentsOnWake: true,
    showVirtualKeyboard: true,
    extraButtons: []
  },

  storageKey: "MMM-HamburgerMenu::profileName",
  wifiStorageKey: "MMM-HamburgerMenu::wifiCredentials",
  locationStorageKey: "MMM-DailyWeatherPrompt::location",
  autoSleepStorageKey: "MMM-HamburgerMenu::autoSleepMinutes",
  complimentsToggleStorageKey: "MMM-HamburgerMenu::showComplimentsOnWake",
  moduleVisibilityStorageKey: "MMM-HamburgerMenu::moduleVisibility",
  sleepLockString: "MMM-HamburgerMenu::sleep",
  moduleToggleLockString: "MMM-HamburgerMenu::module-toggle",

  start() {
    this.isSleeping = false;
    this.isSettingsOpen = false;
    this.profileName = "";
    this.wifiStatus = "";
    this.locationStatus = "";
    this.sleepStatus = "";
    this.complimentStatus = "";
    this.wifiCredentials = { ssid: "", password: "" };
    this.weatherLocation = "";
    this.autoSleepMinutes = this.config.autoSleepMinutes;
    this.showComplimentsOnWake = this.config.showComplimentsOnWake;
    this.moduleVisibility = {};
    this.availableModuleNames = [];
    this.virtualKeyboardState = {
      visible: false,
      shift: false,
      activeKey: null,
      activeInput: null,
      mode: "letters",
    };
    this.sleepTimeout = null;

    this.loadProfileName();
    this.loadWifiCredentials();
    this.loadWeatherLocation();
    this.loadAutoSleepMinutes();
    this.loadComplimentPreference();
    this.loadModuleVisibility();
    this.captureAvailableModules();
    this.applyModuleVisibility();

    if (this.profileName) {
      this.sendProfileUpdate();
    }

    if (this.weatherLocation) {
      this.sendLocationUpdate(this.weatherLocation);
    }

    this.applyComplimentPreference();
    this.resetSleepTimer();
    this.registerActivityListeners();
  },

  getStyles() {
    return ["font-awesome.css", this.file("MMM-HamburgerMenu.css")];
  },

  loadProfileName() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.profileName = stored;
    }
  },

  persistProfileName(name) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.storageKey, name);
  },

  loadWifiCredentials() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.wifiStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.wifiCredentials = {
          ssid: parsed.ssid || "",
          password: parsed.password || "",
        };
      } catch (error) {
        Log.error("Failed to parse stored Wi-Fi credentials", error);
      }
    }
  },

  persistWifiCredentials(credentials) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.wifiStorageKey, JSON.stringify(credentials));
  },

  loadWeatherLocation() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.locationStorageKey);
    if (stored) {
      this.weatherLocation = stored;
    }
  },

  persistWeatherLocation(location) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.locationStorageKey, location);
  },

  loadAutoSleepMinutes() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.autoSleepStorageKey);
    if (stored !== null) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        this.autoSleepMinutes = parsed;
      }
    }
  },

  persistAutoSleepMinutes(minutes) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.autoSleepStorageKey, String(minutes));
  },

  loadComplimentPreference() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.complimentsToggleStorageKey);
    if (stored !== null) {
      this.showComplimentsOnWake = stored === "true";
    }
  },

  loadModuleVisibility() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.moduleVisibilityStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          this.moduleVisibility = parsed;
        }
      } catch (error) {
        Log.error("Failed to parse stored module visibility", error);
      }
    }
  },

  persistModuleVisibility() {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(
      this.moduleVisibilityStorageKey,
      JSON.stringify(this.moduleVisibility)
    );
  },

  persistComplimentPreference(value) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.complimentsToggleStorageKey, String(value));
  },

  clearSleepTimer() {
    if (this.sleepTimeout) {
      clearTimeout(this.sleepTimeout);
      this.sleepTimeout = null;
    }
  },

  resetSleepTimer() {
    this.clearSleepTimer();

    if (this.autoSleepMinutes > 0 && !this.isSleeping) {
      this.sleepTimeout = setTimeout(
        () => this.triggerAutoSleep(),
        this.autoSleepMinutes * 60 * 1000
      );
    }
  },

  triggerAutoSleep() {
    this.isSleeping = true;
    this.isSettingsOpen = false;
    this.sleepScreen();
    this.updateDom();
  },

  registerActivityListeners() {
    const handler = () => {
      if (!this.isSleeping) {
        this.resetSleepTimer();
      }
    };

    ["mousemove", "touchstart", "keydown"].forEach((eventName) => {
      window.addEventListener(eventName, handler, { passive: true });
    });

    this.activityHandler = handler;
  },

  applyComplimentPreference() {
    this.sendNotification("COMPLIMENTS_INITIAL_VISIBILITY", {
      showOnWake: this.showComplimentsOnWake,
    });
  },

  toggleSleep() {
    this.isSleeping = !this.isSleeping;
    if (this.isSleeping) {
      this.isSettingsOpen = false;
      this.sleepScreen();
    } else {
      this.wakeScreen();
    }
    this.updateDom();
  },

  sleepScreen() {
    this.clearSleepTimer();
    const modules = MM.getModules();
    modules.enumerate((module) => {
      if (module?.identifier !== this.identifier) {
        module.hide(500, { lockString: this.sleepLockString });
      }
    });
    this.sendNotification("MIRROR_SLEEP");
  },

  wakeScreen() {
    this.resetSleepTimer();
    const modules = MM.getModules();
    modules.enumerate((module) => {
      const enabled = this.isModuleEnabled(module?.name);
      if (enabled || module?.identifier === this.identifier) {
        module.show(500, { lockString: this.sleepLockString });
      } else {
        module.hide(0, { lockString: this.moduleToggleLockString });
      }
    });
    this.sendNotification("MIRROR_WAKE");
  },

  sendProfileUpdate() {
    this.sendNotification("PROFILE_UPDATED", { profileName: this.profileName });
  },

  handleProfileSubmit(input) {
    const value = (input?.value || "").trim();
    this.profileName = value;
    this.persistProfileName(this.profileName);
    this.sendProfileUpdate();
    this.updateDom();
  },

  handleWifiSubmit(ssidInput, passwordInput) {
    const ssid = (ssidInput?.value || "").trim();
    const password = (passwordInput?.value || "").trim();

    if (!ssid || !password) {
      this.wifiStatus = "SSID and password required";
      this.updateDom();
      return;
    }

    this.wifiCredentials = { ssid, password };
    this.wifiStatus = "Sending Wi-Fi update";
    this.persistWifiCredentials(this.wifiCredentials);

    this.sendNotification("WIFI_CREDENTIALS_UPDATED", {
      ssid,
      password,
    });

    this.wifiStatus = "Wi-Fi update sent";
    this.updateDom();
  },

  handleLocationSubmit(input) {
    const location = (input?.value || "").trim();

    if (!location) {
      this.locationStatus = "Enter a city, state, or ZIP";
      this.updateDom();
      return;
    }

    this.weatherLocation = location;
    this.persistWeatherLocation(location);
    this.sendLocationUpdate(location);
    this.locationStatus = "Location saved";
    this.updateDom();
  },

  sendLocationUpdate(location) {
    this.sendNotification("LOCATION_UPDATED", { location });
  },

  handleSleepSubmit(input) {
    const minutes = Number.parseInt((input?.value || "").trim(), 10);

    if (Number.isNaN(minutes) || minutes < 0) {
      this.sleepStatus = "Enter 0 or a positive number";
      this.updateDom();
      return;
    }

    this.autoSleepMinutes = minutes;
    this.persistAutoSleepMinutes(minutes);
    this.sleepStatus = minutes === 0 ? "Auto sleep disabled" : `Sleeping after ${minutes} minutes`;
    this.resetSleepTimer();
    this.updateDom();
  },

  handleComplimentToggle(input) {
    const isChecked = Boolean(input?.checked);
    this.showComplimentsOnWake = isChecked;
    this.persistComplimentPreference(isChecked);
    this.complimentStatus = isChecked
      ? "Compliments show at wake"
      : "Compliments stay visible without wake greeting";
    this.applyComplimentPreference();
    this.updateDom();
  },

  captureAvailableModules() {
    const modules = MM.getModules();
    const names = new Set();

    modules.enumerate((module) => {
      const moduleName = module?.name;
      if (module?.identifier !== this.identifier && moduleName) {
        if (moduleName.toLowerCase() === "compliments") {
          return;
        }

        names.add(moduleName);
      }
    });

    if (names.size === 0 && window.config && Array.isArray(window.config.modules)) {
      window.config.modules.forEach((moduleConfig) => {
        const moduleName = moduleConfig?.module;
        if (moduleName && moduleName !== this.name) {
          if (moduleName.toLowerCase() === "compliments") {
            return;
          }

          names.add(moduleName);
        }
      });
    }

    this.availableModuleNames = Array.from(names).sort();
  },

  isModuleEnabled(moduleName) {
    if (!moduleName) {
      return true;
    }

    const stored = this.moduleVisibility[moduleName];
    if (typeof stored === "boolean") {
      return stored;
    }

    return true;
  },

  applyModuleVisibility() {
    const modules = MM.getModules();
    modules.enumerate((module) => {
      if (module?.identifier === this.identifier) {
        return;
      }

      const enabled = this.isModuleEnabled(module?.name);
      if (enabled) {
        module.show(0, { lockString: this.moduleToggleLockString });
      } else {
        module.hide(0, { lockString: this.moduleToggleLockString });
      }
    });
  },

  handleModuleToggle(moduleName, isEnabled) {
    this.moduleVisibility[moduleName] = isEnabled;
    this.persistModuleVisibility();

    const modules = MM.getModules();
    modules.enumerate((module) => {
      if (module?.name !== moduleName) {
        return;
      }

      if (isEnabled) {
        module.show(0, { lockString: this.moduleToggleLockString });
      } else {
        module.hide(0, { lockString: this.moduleToggleLockString });
      }
    });
  },

  createActionButton(label, icon, action, payload = {}, options = {}) {
    const button = document.createElement("button");
    button.className = "mmm-hamburger-menu__action";
    button.setAttribute("aria-label", label);

    const iconElement = document.createElement("i");
    iconElement.className = `fa fa-${icon}`;
    button.appendChild(iconElement);

    const text = document.createElement("span");
    text.textContent = label;
    if (options.showLabel === false) {
      text.className = "mmm-hamburger-menu__sr-only";
    }
    button.appendChild(text);

    button.addEventListener("click", () => {
      if (typeof action === "function") {
        action();
      } else if (action) {
        this.sendNotification(action, payload);
      }
    });

    return button;
  },

  registerKeyboardInput(input, key) {
    if (!input) {
      return;
    }

    if (this.virtualKeyboardState.activeKey === key) {
      this.virtualKeyboardState.activeInput = input;
    }

    input.addEventListener("focus", () => {
      this.virtualKeyboardState.activeKey = key;
      this.virtualKeyboardState.activeInput = input;
      this.virtualKeyboardState.visible = true;
      this.updateDom();
    });
  },

  renderProfileInput() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__profile";

    const label = document.createElement("label");
    label.className = "mmm-hamburger-menu__profile-label";
    label.textContent = "Profile";
    label.setAttribute("for", `${this.identifier}-profile-input`);
    form.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `${this.identifier}-profile-input`;
    input.placeholder = this.config.profilePlaceholder;
    input.value = this.profileName;
    form.appendChild(input);

    this.registerKeyboardInput(input, "profile");

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mmm-hamburger-menu__save";
    submit.textContent = this.config.saveProfileLabel;
    form.appendChild(submit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleProfileSubmit(input);
    });

    return form;
  },

  renderSleepToggle() {
    const button = this.createActionButton(
      this.isSleeping ? this.config.wakeLabel : this.config.sleepLabel,
      this.isSleeping ? "moon-o" : "power-off",
      () => this.toggleSleep(),
      {},
      { showLabel: false }
    );

    button.classList.add("mmm-hamburger-menu__action--sleep");
    if (this.isSleeping) {
      button.classList.add("is-sleeping");
    }
    button.setAttribute("aria-pressed", String(this.isSleeping));

    return button;
  },

  renderSettingsToggle() {
    const button = this.createActionButton(
      this.config.settingsLabel,
      "cog",
      () => {
        this.isSettingsOpen = !this.isSettingsOpen;
        this.updateDom();
      },
      {},
      { showLabel: false }
    );

    button.classList.add("mmm-hamburger-menu__action--settings");
    button.setAttribute("aria-pressed", String(this.isSettingsOpen));

    return button;
  },

  renderWifiForm() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__wifi";

    const label = document.createElement("div");
    label.className = "mmm-hamburger-menu__section-title";
    label.textContent = this.config.wifiLabel;
    form.appendChild(label);

    const ssid = document.createElement("input");
    ssid.type = "text";
    ssid.placeholder = this.config.wifiSsidPlaceholder;
    ssid.value = this.wifiCredentials.ssid;
    form.appendChild(ssid);

    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = this.config.wifiPasswordPlaceholder;
    password.value = this.wifiCredentials.password;
    form.appendChild(password);

    this.registerKeyboardInput(ssid, "wifi-ssid");
    this.registerKeyboardInput(password, "wifi-password");

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mmm-hamburger-menu__save";
    submit.textContent = this.config.wifiSaveLabel;
    form.appendChild(submit);

    if (this.wifiStatus) {
      const status = document.createElement("div");
      status.className = "mmm-hamburger-menu__status";
      status.textContent = this.wifiStatus;
      form.appendChild(status);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleWifiSubmit(ssid, password);
    });

    return form;
  },

  renderLocationForm() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__location";

    const label = document.createElement("div");
    label.className = "mmm-hamburger-menu__section-title";
    label.textContent = this.config.locationLabel;
    form.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = this.config.locationPlaceholder;
    input.value = this.weatherLocation;
    form.appendChild(input);

    this.registerKeyboardInput(input, "location");

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mmm-hamburger-menu__save";
    submit.textContent = this.config.locationSaveLabel;
    form.appendChild(submit);

    if (this.locationStatus) {
      const status = document.createElement("div");
      status.className = "mmm-hamburger-menu__status";
      status.textContent = this.locationStatus;
      form.appendChild(status);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleLocationSubmit(input);
    });

    return form;
  },

  renderExtraButtons(container) {
    if (!Array.isArray(this.config.extraButtons)) {
      return;
    }

    this.config.extraButtons.forEach((buttonConfig, index) => {
      const label = buttonConfig?.label || `Action ${index + 1}`;
      const icon = buttonConfig?.icon || "circle";
      const notification = buttonConfig?.notification || "HAMBURGER_ACTION";
      const payload = buttonConfig?.payload || { index };

      const button = this.createActionButton(label, icon, notification, payload);
      container.appendChild(button);
    });
  },

  renderSettingsPanel() {
    this.captureAvailableModules();

    const panel = document.createElement("div");
    panel.className = "mmm-hamburger-menu__panel";

    const heading = document.createElement("div");
    heading.className = "mmm-hamburger-menu__panel-title";
    heading.textContent = this.config.settingsLabel;
    panel.appendChild(heading);

    const scrollable = document.createElement("div");
    scrollable.className = "mmm-hamburger-menu__panel-content";

    if (this.availableModuleNames.length > 0) {
      scrollable.appendChild(this.renderModuleToggles());
    }

    const forms = document.createElement("div");
    forms.className = "mmm-hamburger-menu__forms";
    forms.appendChild(this.renderProfileInput());
    forms.appendChild(this.renderWifiForm());
    forms.appendChild(this.renderLocationForm());
    forms.appendChild(this.renderSleepForm());
    forms.appendChild(this.renderComplimentToggle());

    scrollable.appendChild(forms);
    panel.appendChild(scrollable);

    if (this.config.showVirtualKeyboard) {
      panel.appendChild(this.renderVirtualKeyboard());
    }

    return panel;
  },

  renderSleepForm() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__sleep";

    const label = document.createElement("div");
    label.className = "mmm-hamburger-menu__section-title";
    label.textContent = this.config.sleepTimerLabel;
    form.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.value = this.autoSleepMinutes;
    input.inputMode = "numeric";
    form.appendChild(input);

    this.registerKeyboardInput(input, "sleep-timer");

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mmm-hamburger-menu__save";
    submit.textContent = this.config.sleepSaveLabel;
    form.appendChild(submit);

    const helper = document.createElement("div");
    helper.className = "mmm-hamburger-menu__helper";
    helper.textContent = this.config.sleepTimerHelper;
    form.appendChild(helper);

    if (this.sleepStatus) {
      const status = document.createElement("div");
      status.className = "mmm-hamburger-menu__status";
      status.textContent = this.sleepStatus;
      form.appendChild(status);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSleepSubmit(input);
    });

    return form;
  },

  renderComplimentToggle() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__compliments";

    const label = document.createElement("div");
    label.className = "mmm-hamburger-menu__section-title";
    label.textContent = this.config.complimentsToggleLabel;
    form.appendChild(label);

    const toggleWrapper = document.createElement("label");
    toggleWrapper.className = "mmm-hamburger-menu__toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.showComplimentsOnWake;
    toggleWrapper.appendChild(input);

    const span = document.createElement("span");
    span.textContent = this.config.complimentsToggleHelper;
    toggleWrapper.appendChild(span);

    form.appendChild(toggleWrapper);

    if (this.complimentStatus) {
      const status = document.createElement("div");
      status.className = "mmm-hamburger-menu__status";
      status.textContent = this.complimentStatus;
      form.appendChild(status);
    }

    form.addEventListener("change", () => {
      this.handleComplimentToggle(input);
    });

    return form;
  },

  formatModuleLabel(moduleName) {
    if (!moduleName) {
      return "Unknown";
    }

    const lower = moduleName.toLowerCase();
    const friendlyMap = {
      "mmm-dailyweatherprompt": "Weather",
      "mmm-dynamicweather": "Weather Effects",
      updatenotification: "Updates",
    };

    if (friendlyMap[lower]) {
      return friendlyMap[lower];
    }

    const withoutPrefix = moduleName.replace(/^MMM-/, "");
    return withoutPrefix
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  },

  renderModuleToggles() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-hamburger-menu__modules";

    const title = document.createElement("div");
    title.className = "mmm-hamburger-menu__section-title";
    title.textContent = this.config.modulesLabel;
    wrapper.appendChild(title);

    const helper = document.createElement("div");
    helper.className = "mmm-hamburger-menu__helper";
    helper.textContent = this.config.modulesHelper;
    wrapper.appendChild(helper);

    const list = document.createElement("div");
    list.className = "mmm-hamburger-menu__modules-list";

    this.availableModuleNames.forEach((moduleName) => {
      const row = document.createElement("label");
      row.className = "mmm-hamburger-menu__module-row";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = this.isModuleEnabled(moduleName);
      input.addEventListener("change", () => {
        this.handleModuleToggle(moduleName, Boolean(input.checked));
      });

      const name = document.createElement("span");
      name.textContent = this.formatModuleLabel(moduleName);

      row.appendChild(input);
      row.appendChild(name);
      list.appendChild(row);
    });

    wrapper.appendChild(list);
    return wrapper;
  },

  renderVirtualKeyboard() {
    const keyboardWrapper = document.createElement("div");
    keyboardWrapper.className = "mmm-hamburger-menu__keyboard";
    keyboardWrapper.style.display = this.virtualKeyboardState.visible
      ? "flex"
      : "none";

    const modeSwitcher = document.createElement("div");
    modeSwitcher.className = "mmm-hamburger-menu__keyboard-modes";

    const letterButton = document.createElement("button");
    letterButton.type = "button";
    letterButton.textContent = "ABC";
    letterButton.className = "mmm-hamburger-menu__keyboard-mode";
    letterButton.addEventListener("click", () => {
      this.virtualKeyboardState.mode = "letters";
      this.virtualKeyboardState.shift = false;
      this.updateDom();
    });

    const numberButton = document.createElement("button");
    numberButton.type = "button";
    numberButton.textContent = "123";
    numberButton.className = "mmm-hamburger-menu__keyboard-mode";
    numberButton.addEventListener("click", () => {
      this.virtualKeyboardState.mode = "numbers";
      this.virtualKeyboardState.shift = false;
      this.updateDom();
    });

    const setModeButtonState = () => {
      letterButton.classList.toggle(
        "is-active",
        this.virtualKeyboardState.mode === "letters"
      );
      numberButton.classList.toggle(
        "is-active",
        this.virtualKeyboardState.mode === "numbers"
      );
    };

    setModeButtonState();
    modeSwitcher.appendChild(letterButton);
    modeSwitcher.appendChild(numberButton);
    keyboardWrapper.appendChild(modeSwitcher);

    const rows =
      this.virtualKeyboardState.mode === "numbers"
        ? [
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
            ["0", "⌫", "clear"],
            ["space", "hide"],
          ]
        : [
            ["a", "b", "c", "d", "e", "f", "g", "h"],
            ["i", "j", "k", "l", "m", "n", "o", "p"],
            ["q", "r", "s", "t", "u", "v", "w", "x"],
            ["y", "z", "@", "-", "_", ".", "⌫", "⇧"],
            ["space", "clear", "hide"],
          ];

    const keyButtons = [];

    const refreshLabels = () => {
      setModeButtonState();

      keyButtons.forEach(({ button, key }) => {
        if (key === "space") {
          button.textContent = "Space";
        } else if (key === "clear") {
          button.textContent = "Clear";
        } else if (key === "hide") {
          button.textContent = "Hide";
        } else if (key === "⌫") {
          button.textContent = "⌫";
        } else if (key === "⇧") {
          button.textContent = this.virtualKeyboardState.shift ? "⇧ (on)" : "⇧";
        } else {
          button.textContent = this.virtualKeyboardState.shift ? key.toUpperCase() : key;
        }
      });
    };

    const insertAtCursor = (char) => {
      const input = this.virtualKeyboardState.activeInput;
      if (!input) {
        return;
      }

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = input.value || "";
      input.value = `${current.slice(0, start)}${char}${current.slice(end)}`;
      const cursor = start + char.length;
      input.setSelectionRange(cursor, cursor);
      input.focus();
    };

    const backspace = () => {
      const input = this.virtualKeyboardState.activeInput;
      if (!input) {
        return;
      }

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = input.value || "";

      if (start === end && start > 0) {
        const nextPos = start - 1;
        input.value = `${current.slice(0, start - 1)}${current.slice(end)}`;
        input.setSelectionRange(nextPos, nextPos);
      } else if (start !== end) {
        input.value = `${current.slice(0, start)}${current.slice(end)}`;
        input.setSelectionRange(start, start);
      }

      input.focus();
    };

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "mmm-hamburger-menu__keyboard-row";

      row.forEach((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mmm-hamburger-menu__keyboard-key";
        button.addEventListener("click", () => {
          const active = this.virtualKeyboardState.activeInput;
          if (!active) {
            return;
          }

          if (key === "space") {
            insertAtCursor(" ");
            return;
          }

          if (key === "clear") {
            active.value = "";
            active.focus();
            return;
          }

          if (key === "hide") {
            this.virtualKeyboardState.visible = false;
            this.virtualKeyboardState.activeInput = null;
            this.virtualKeyboardState.activeKey = null;
            this.updateDom();
            return;
          }

          if (key === "⌫") {
            backspace();
            return;
          }

          if (key === "⇧") {
            this.virtualKeyboardState.shift = !this.virtualKeyboardState.shift;
            refreshLabels();
            return;
          }

          const charToInsert = this.virtualKeyboardState.shift ? key.toUpperCase() : key;
          insertAtCursor(charToInsert);
        });

        keyButtons.push({ button, key });
        rowEl.appendChild(button);
      });

      keyboardWrapper.appendChild(rowEl);
    });

    refreshLabels();
    return keyboardWrapper;
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-hamburger-menu";
    if (this.isSleeping) {
      wrapper.classList.add("sleeping");
    }
    if (this.isSettingsOpen) {
      wrapper.classList.add("settings-open");
    }

    const bar = document.createElement("div");
    bar.className = "mmm-hamburger-menu__bar";

    const actions = document.createElement("div");
    actions.className = "mmm-hamburger-menu__actions";

    if (!this.isSleeping) {
      const settingsButton = this.renderSettingsToggle();
      actions.appendChild(settingsButton);
    }

    actions.appendChild(this.renderSleepToggle());

    this.renderExtraButtons(actions);

    if (this.isSettingsOpen) {
      wrapper.appendChild(this.renderSettingsPanel());
    }

    bar.appendChild(actions);

    wrapper.appendChild(bar);

    return wrapper;
  }
});
