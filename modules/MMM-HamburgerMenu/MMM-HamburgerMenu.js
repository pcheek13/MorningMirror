/* global Module, MM, Log */

Module.register("MMM-HamburgerMenu", {
  defaults: {
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
  },

  storageKey: "MMM-HamburgerMenu::profileName",
  wifiStorageKey: "MMM-HamburgerMenu::wifiCredentials",
  locationStorageKey: "MMM-DailyWeatherPrompt::location",
  sleepLockString: "MMM-HamburgerMenu::sleep",

  start() {
    this.isSleeping = false;
    this.isSettingsOpen = false;
    this.profileName = "";
    this.wifiStatus = "";
    this.locationStatus = "";
    this.wifiCredentials = { ssid: "", password: "" };
    this.weatherLocation = "";

    this.loadProfileName();
    this.loadWifiCredentials();
    this.loadWeatherLocation();

    if (this.profileName) {
      this.sendProfileUpdate();
    }

    if (this.weatherLocation) {
      this.sendLocationUpdate(this.weatherLocation);
    }
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

  toggleSleep() {
    this.isSleeping = !this.isSleeping;
    if (this.isSleeping) {
      this.sleepScreen();
    } else {
      this.wakeScreen();
    }
    this.updateDom();
  },

  sleepScreen() {
    const modules = MM.getModules();
    modules.enumerate((module) => {
      if (module?.identifier !== this.identifier) {
        module.hide(500, { lockString: this.sleepLockString });
      }
    });
    this.sendNotification("MIRROR_SLEEP");
  },

  wakeScreen() {
    const modules = MM.getModules();
    modules.enumerate((module) => {
      module.show(500, { lockString: this.sleepLockString });
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
      this.config.sleepLabel,
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
    const panel = document.createElement("div");
    panel.className = "mmm-hamburger-menu__panel";

    const heading = document.createElement("div");
    heading.className = "mmm-hamburger-menu__panel-title";
    heading.textContent = this.config.settingsLabel;
    panel.appendChild(heading);

    const forms = document.createElement("div");
    forms.className = "mmm-hamburger-menu__forms";
    forms.appendChild(this.renderProfileInput());
    forms.appendChild(this.renderWifiForm());
    forms.appendChild(this.renderLocationForm());

    panel.appendChild(forms);

    return panel;
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

    actions.appendChild(this.renderSleepToggle());

    const settingsButton = this.renderSettingsToggle();
    actions.appendChild(settingsButton);

    this.renderExtraButtons(actions);

    if (this.isSettingsOpen) {
      wrapper.appendChild(this.renderSettingsPanel());
    }

    bar.appendChild(actions);

    wrapper.appendChild(bar);

    return wrapper;
  }
});
