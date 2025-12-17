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
    extraButtons: []
  },

  storageKey: "MMM-HamburgerMenu::profileName",
  wifiStorageKey: "MMM-HamburgerMenu::wifiCredentials",
  sleepLockString: "MMM-HamburgerMenu::sleep",

  start() {
    this.isSleeping = false;
    this.profileName = "";
    this.wifiStatus = "";
    this.wifiCredentials = { ssid: "", password: "" };

    this.loadProfileName();
    this.loadWifiCredentials();

    if (this.profileName) {
      this.sendProfileUpdate();
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

    this.updateDom();
  },

  createActionButton(label, icon, notification, payload = {}) {
    const button = document.createElement("button");
    button.className = "mmm-hamburger-menu__action";

    const iconElement = document.createElement("i");
    iconElement.className = `fa fa-${icon}`;
    button.appendChild(iconElement);

    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);

    button.addEventListener("click", () => {
      if (notification) {
        this.sendNotification(notification, payload);
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
    const button = document.createElement("button");
    button.className = "mmm-hamburger-menu__action mmm-hamburger-menu__action--sleep";
    if (this.isSleeping) {
      button.classList.add("is-sleeping");
    }
    button.setAttribute("aria-pressed", String(this.isSleeping));
    button.setAttribute("aria-label", this.config.sleepLabel);

    const iconElement = document.createElement("i");
    iconElement.className = this.isSleeping ? "fa fa-moon-o" : "fa fa-power-off";
    button.appendChild(iconElement);

    const text = document.createElement("span");
    text.textContent = this.config.sleepLabel;
    button.appendChild(text);

    const state = document.createElement("small");
    state.textContent = this.isSleeping ? this.config.wakeLabel : "On";
    button.appendChild(state);

    button.addEventListener("click", () => this.toggleSleep());

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

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-hamburger-menu";
    if (this.isSleeping) {
      wrapper.classList.add("sleeping");
    }

    const bar = document.createElement("div");
    bar.className = "mmm-hamburger-menu__bar";

    const actions = document.createElement("div");
    actions.className = "mmm-hamburger-menu__actions";

    actions.appendChild(this.renderSleepToggle());

    const settingsButton = this.createActionButton(
      this.config.settingsLabel,
      "cog",
      "OPEN_SETTINGS_PANEL"
    );
    settingsButton.classList.add("mmm-hamburger-menu__action--settings");
    actions.appendChild(settingsButton);

    this.renderExtraButtons(actions);

    bar.appendChild(actions);
    bar.appendChild(this.renderWifiForm());
    bar.appendChild(this.renderProfileInput());

    wrapper.appendChild(bar);

    return wrapper;
  }
});
