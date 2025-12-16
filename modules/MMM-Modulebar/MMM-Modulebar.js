/* global Module */

/* Magic Mirror 2
 * Module: MMM-Modulebar
 *
 * By Erik Pettersson
 * Based on the TouchNavigation Module by Brian Janssen
 *
 * MIT Licensed.
 */

Module.register("MMM-Modulebar", {
  requiresVersion: "2.1.0",

  defaults: {
    // Allow the module to force modules to be shown (if hidden and locked by another module ex. profile-switcher).
    allowForce: false,
    // Determines if the border around the buttons should be shown.
    showBorder: true,
    // The minimum width for all the buttons.
    minWidth: "0px",
    // The minimum height for all the buttons.
    minHeight: "0px",
    // The location of the symbol relative to the text. Options: left, right, top or bottom
    picturePlacement: "left",
    // The direction of the bar. Options: row, column, row-reverse or column-reverse
    direction: "row",
    // The speed of the hide and show animation.
    animationSpeed: 1000,
    // Z-Index value for the hide all plane.
    zindex: 1000,
    // Visibility of the "unhide all button" when all is hidden (0.0 - 1.0).
    visability: 0.5,
    // Minutes of inactivity before the overlay hides the mirror.
    sleepAfterMinutes: 20,
    // Settings persisted locally for quick recall.
    settingsStorageKey: "MMM-Modulebar::settings",
    // Label for the settings trigger button.
    settingsButton: {
      module: "settings",
      symbol: "cog",
      text: "Settings"
    },
    // Default saved values
    settingsDefaults: {
      location: "",
      profileName: "",
      ssid: "",
      password: ""
    },
    // The default button 1. Add your buttons in the config.
    buttons: {
      "1": {
        // Hides and show everything (Same as MMM-HideALL).
        module: "all",
        // When everything is shown - Toggle-on symbol from font-awesome.
        symbol: "toggle-on",
        // When everything is hidden - Toggle-off symbol from font-awesome.
        symbol2: "toggle-off"
      },
      "2": {
        // The modules exact name to be affected (clock in this case).
        module: "clock",
        // When module is shown - Bell symbol from font-awesome.
        symbol: "bell",
        // When module is hidden - Bell-Slash symbol from font-awesome.
        symbol2: "bell-slash"
      }
    }
  },

  start() {
    this.modulesHidden = false;
    this.sleepTimer = null;
    this.overlay = null;
    this.settingsPanelOpen = false;
    this.moduleVisibilitySnapshot = null;
    this.settings = Object.assign({}, this.config.settingsDefaults);
    this.allButtonVisuals = null;
    this.loadSettings();
    this.broadcastSettings();
    this.resetSleepTimer();
  },

  // No external scripts required.
  getScripts() {
    return [];
  },

  // Define required styles.
  getStyles() {
    return ["/css/font-awesome.css", "MMM-Modulebar.css"];
  },

  // Override dom generator.
  getDom() {
    const container = document.createElement("div");
    container.className = "modulebar-container";

    const overlay = document.createElement("div");
    overlay.className = "paint-it-black";
    overlay.style.transitionDuration = `${this.config.animationSpeed}ms`;
    this.overlay = overlay;

    const menu = document.createElement("span");
    menu.className = "modulebar-menu";
    menu.id = `${this.identifier}_menu`;
    menu.style.flexDirection = this.config.direction;

    for (const num in this.config.buttons) {
      menu.appendChild(this.createButton(this, num, this.config.buttons[num], this.config.picturePlacement, overlay));
    }

    const settingsButton = Object.assign({ module: "settings" }, this.config.settingsButton);
    menu.appendChild(this.createButton(this, "settings", settingsButton, this.config.picturePlacement, overlay));

    menu.appendChild(overlay);
    container.appendChild(menu);
    container.appendChild(this.createSettingsPanel());
    this.syncAllButtonVisuals();
    return container;
  },

  resetSleepTimer() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
    }
    this.sleepTimer = setTimeout(() => {
      if (!this.modulesHidden) {
        this.hideAllModules(this.allButtonVisuals);
      }
    }, this.config.sleepAfterMinutes * 60 * 1000);
  },

  loadSettings() {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const stored = localStorage.getItem(this.config.settingsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = Object.assign({}, this.config.settingsDefaults, parsed);
      }
    } catch (error) {
      console.error("MMM-Modulebar: unable to parse saved settings", error);
    }
  },

  saveSettings() {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(this.config.settingsStorageKey, JSON.stringify(this.settings));
  },

  toggleSettingsPanel() {
    this.settingsPanelOpen = !this.settingsPanelOpen;
    this.updateDom(this.config.animationSpeed);
  },

  broadcastSettings() {
    if (this.settings.location) {
      this.sendNotification("LOCATION_UPDATED", { location: this.settings.location });
    }
    this.sendNotification("PROFILE_UPDATED", { profileName: this.settings.profileName });
    if (this.settings.ssid && this.settings.password) {
      this.sendNotification("WIFI_CREDENTIALS_UPDATED", {
        ssid: this.settings.ssid,
        password: this.settings.password
      });
    }
  },

  hideAllModules(visuals) {
    if (this.overlay) {
      this.overlay.classList.add("visible");
      this.overlay.style.transitionDuration = `${this.config.animationSpeed}ms`;
    }

    if (!this.moduleVisibilitySnapshot) {
      this.moduleVisibilitySnapshot = {};
      const modules = MM.getModules();
      modules.forEach((module) => {
        if (module.name === this.name && module.identifier === this.identifier) {
          return;
        }
        this.moduleVisibilitySnapshot[module.identifier] = module.hidden;
        if (!module.hidden) {
          module.hide(this.config.animationSpeed, 0, { force: this.config.allowForce });
        }
      });
    }

    this.modulesHidden = true;
    this.updateToggleVisuals(true, visuals);
    this.sendNotification("MIRROR_SLEEP", { hiddenStates: this.moduleVisibilitySnapshot });
    console.log("Hiding all!");
  },

  showAllModules(visuals) {
    if (this.overlay) {
      this.overlay.classList.remove("visible");
      this.overlay.style.transitionDuration = `${this.config.animationSpeed}ms`;
    }

    const modules = MM.getModules();
    if (this.moduleVisibilitySnapshot) {
      modules.forEach((module) => {
        if (module.name === this.name && module.identifier === this.identifier) {
          return;
        }
        const wasHidden = this.moduleVisibilitySnapshot[module.identifier];
        if (wasHidden === false && module.hidden) {
          module.show(this.config.animationSpeed, 0, { force: this.config.allowForce });
        }
      });
    }

    this.modulesHidden = false;
    this.updateToggleVisuals(false, visuals);
    this.sendNotification("MIRROR_WAKE", { hiddenStates: this.moduleVisibilitySnapshot });
    this.moduleVisibilitySnapshot = null;
    this.resetSleepTimer();
    console.log("Showing all!");
  },

  updateToggleVisuals(hidden, visuals) {
    const visual = visuals || this.allButtonVisuals;
    if (!visual) {
      return;
    }
    const { symbol, image, text, data, faclassName } = visual;
    if (hidden) {
      if (symbol && typeof data.symbol2 !== "undefined") {
        symbol.className = `${faclassName}${data.symbol2}`;
        if (data.size) {
          symbol.className += ` fa-${data.size}${data.size == 1 ? "g" : "x"}`;
        }
      } else if (image && typeof data.img2 !== "undefined") {
        image.className = "modulebar-picture";
        image.src = data.img2;
      }
      if (text && typeof data.text2 !== "undefined") {
        text.innerHTML = data.text2;
      }
    } else {
      if (symbol && typeof data.symbol !== "undefined") {
        symbol.className = `${faclassName}${data.symbol}`;
        if (data.size) {
          symbol.className += ` fa-${data.size}${data.size == 1 ? "g" : "x"}`;
        }
      } else if (image && typeof data.img !== "undefined") {
        image.className = "modulebar-picture";
        image.src = data.img;
      }
      if (text && typeof data.text !== "undefined") {
        text.innerHTML = data.text;
      }
    }
  },

  syncAllButtonVisuals() {
    this.updateToggleVisuals(this.modulesHidden, this.allButtonVisuals);
  },

  // Creates the buttons.
  createButton(self, num, data, placement, overlay) {
    // Creates the span element to contain all the buttons.
    const item = document.createElement("span");
    item.id = `${self.identifier}_button_${num}`;
    item.className = "modulebar-button";

    const modules = MM.getModules();

    const setOverlayVisible = function (show) {
      overlay.classList.toggle("visible", show);
      overlay.style.transitionDuration = `${self.config.animationSpeed}ms`;
      if (show) {
        item.style.opacity = self.config.visability;
        item.style.zIndex = self.config.zindex;
      } else {
        item.style.opacity = 1;
        item.style.zIndex = "";
      }
    };

    // Check for fas, far or fab in symbol.
    let isfasthere;
    let isfabthere;
    let isfarthere;
    if (typeof data.symbol !== "undefined") {
      isfasthere = data.symbol.includes("fas ");
      isfabthere = data.symbol.includes("fab ");
      isfarthere = data.symbol.includes("far ");
    }
    let isfasthere2;
    let isfabthere2;
    let isfarthere2;
    if (typeof data.symbol2 !== "undefined") {
      isfasthere2 = data.symbol2.includes("fas ");
      isfabthere2 = data.symbol2.includes("fab ");
      isfarthere2 = data.symbol2.includes("far ");
    }

    let faclassName;
    if (isfasthere === true || isfasthere2 === true || isfabthere === true || isfabthere2 === true || isfarthere === true || isfarthere2 === true) {
      faclassName = "modulebar-picture ";
    } else {
      faclassName = "modulebar-picture fas fa-";
      item.style.minWidth = self.config.minWidth;
      item.style.minHeight = self.config.minHeight;
      item.style.transition = `opacity ${self.config.animationSpeed}ms ease`;
    }

    const handleToggle = () => {
      self.resetSleepTimer();
      if (data.module === "settings") {
        self.toggleSettingsPanel();
        return;
      }

      if (typeof data.gotoUrl !== "undefined") {
        if (data.gotoUrl === "back") {
          window.history.back();
        } else {
          window.location.assign(data.gotoUrl);
        }
      }

      if (data.module === "all") {
        const visuals = { symbol, image, text, faclassName, data };
        self.allButtonVisuals = visuals;
        if (self.modulesHidden) {
          setOverlayVisible(false);
          self.showAllModules(visuals);
        } else {
          setOverlayVisible(true);
          self.hideAllModules(visuals);
        }
        return;
      }

      for (let i = 0; i < modules.length; i++) {
        if (modules[i].name === data.module) {
          const idnr = modules[i].data.identifier.split("_");
          let idnumber;
          if (Array.isArray(data.idnum)) {
            idnumber = data.idnum.find(function (element) {
              return element == idnr[1];
            });
          } else {
            idnumber = data.idnum;
          }

          if (idnr[1] == idnumber || data.idnum == null) {
            if (modules[i].hidden) {
              if (data.showUrl != null) {
                fetch(data.showUrl);
                console.log("Visiting show URL: " + data.showUrl);
              }
              modules[i].show(self.config.animationSpeed, 0, { force: self.config.allowForce });
              if (typeof data.symbol !== "undefined") {
                symbol.className = faclassName + data.symbol;
                if (data.size) {
                  symbol.className += " fa-" + data.size;
                  symbol.className += data.size == 1 ? "g" : "x";
                }
              } else if (typeof data.img !== "undefined") {
                image.className = "modulebar-picture";
                image.src = data.img;
              }
              if (typeof data.text !== "undefined") {
                text.innerHTML = data.text;
              }
              console.log("Showing " + modules[i].name + " ID: " + idnr[1]);
            } else {
              modules[i].hide(self.config.animationSpeed, 0, { force: self.config.allowForce });
              if (typeof data.symbol2 !== "undefined") {
                symbol.className = faclassName + data.symbol2;
                if (data.size) {
                  symbol.className += " fa-" + data.size;
                  symbol.className += data.size == 1 ? "g" : "x";
                }
              } else if (typeof data.img2 !== "undefined") {
                image.className = "modulebar-picture";
                image.src = data.img2;
              }
              if (typeof data.text2 !== "undefined") {
                text.innerHTML = data.text2;
              }
              console.log("Hiding " + modules[i].name + " ID: " + idnr[1]);
              if (data.hideUrl != null) {
                fetch(data.hideUrl);
                console.log("Visiting hide URL: " + data.hideUrl);
              }
            }
          }
        }
      }
    };

    item.addEventListener("click", handleToggle);

    item.style.flexDirection = {
      right: "row-reverse",
      left: "row",
      top: "column",
      bottom: "column-reverse"
    }[placement];

    if (!self.config.showBorder) {
      item.style.borderColor = "black";
    }

    let symbol;
    let image;
    let text;
    if (data.symbol) {
      symbol = document.createElement("span");
      symbol.className = faclassName + data.symbol;
      if (data.size) {
        symbol.className += " fa-" + data.size;
        symbol.className += data.size == 1 ? "g" : "x";
      }
      if (data.text && placement === "left") {
        symbol.style.marginRight = "4px";
      }
      item.appendChild(symbol);
    } else if (data.img) {
      image = document.createElement("img");
      image.className = "modulebar-picture";
      image.src = data.img;
      if (data.width) image.width = data.width;
      if (data.height) image.height = data.height;
      if (data.text && placement === "left") {
        image.style.marginRight = "4px";
      }
      item.appendChild(image);
    }

    if (data.text) {
      text = document.createElement("span");
      text.className = "modulebar-text";
      text.innerHTML = data.text;
      if ((data.symbol || data.img) && placement === "right") {
        text.style.marginRight = "4px";
      }
      item.appendChild(text);
    }

    if (data.module === "all") {
      this.allButtonVisuals = { symbol, image, text, data, faclassName };
    }

    return item;
  },

  createSettingsPanel() {
    const wrapper = document.createElement("div");
    wrapper.className = `modulebar-settings ${this.settingsPanelOpen ? "open" : ""}`;

    const header = document.createElement("div");
    header.className = "modulebar-settings__header";
    const title = document.createElement("div");
    title.className = "modulebar-settings__title";
    title.innerHTML = "Settings";
    const close = document.createElement("button");
    close.className = "modulebar-settings__close";
    close.innerHTML = "×";
    close.addEventListener("click", () => {
      this.settingsPanelOpen = false;
      this.updateDom(this.config.animationSpeed);
    });
    header.appendChild(title);
    header.appendChild(close);
    wrapper.appendChild(header);

    const form = document.createElement("div");
    form.className = "modulebar-settings__form";

    // Location input with keypad
    form.appendChild(this.buildFieldGroup("Location (city, state, country or ZIP)", this.settings.location, (value) => {
      this.settings.location = value;
    }, true));

    // WiFi inputs
    form.appendChild(this.buildFieldGroup("WiFi SSID", this.settings.ssid, (value) => {
      this.settings.ssid = value;
    }));
    form.appendChild(this.buildFieldGroup("WiFi Password", this.settings.password, (value) => {
      this.settings.password = value;
    }, false, true));

    // Profile name
    form.appendChild(this.buildFieldGroup("Profile Name", this.settings.profileName, (value) => {
      this.settings.profileName = value;
    }));

    const actions = document.createElement("div");
    actions.className = "modulebar-settings__actions";

    const saveBtn = document.createElement("button");
    saveBtn.className = "modulebar-settings__save";
    saveBtn.innerHTML = "Apply to modules";
    saveBtn.addEventListener("click", () => {
      this.saveSettings();
      this.broadcastSettings();
      this.settingsPanelOpen = false;
      this.updateDom(this.config.animationSpeed);
    });

    const rebootBtn = document.createElement("button");
    rebootBtn.className = "modulebar-settings__reboot";
    rebootBtn.innerHTML = "Reboot mirror";
    rebootBtn.addEventListener("click", () => {
      this.sendSocketNotification("MMM_MODULEBAR_REBOOT", { reason: "User requested reboot" });
    });

    actions.appendChild(saveBtn);
    actions.appendChild(rebootBtn);
    form.appendChild(actions);

    wrapper.appendChild(form);

    return wrapper;
  },

  buildFieldGroup(labelText, value, onChange, includeKeypad = false, isPassword = false) {
    const group = document.createElement("div");
    group.className = "modulebar-settings__group";

    const label = document.createElement("label");
    label.className = "modulebar-settings__label";
    label.innerHTML = labelText;
    group.appendChild(label);

    const input = document.createElement("input");
    input.type = isPassword ? "password" : "text";
    input.value = value || "";
    input.addEventListener("input", (event) => onChange(event.target.value));
    group.appendChild(input);

    if (includeKeypad) {
      const keypad = document.createElement("div");
      keypad.className = "modulebar-settings__keypad";
      const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ",", " "];
      digits.forEach((digit) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = digit === " " ? "Space" : digit;
        btn.addEventListener("click", () => {
          input.value = `${input.value}${digit}`;
          onChange(input.value);
        });
        keypad.appendChild(btn);
      });
      const clear = document.createElement("button");
      clear.type = "button";
      clear.innerHTML = "Clear";
      clear.addEventListener("click", () => {
        input.value = "";
        onChange("");
      });
      keypad.appendChild(clear);
      group.appendChild(keypad);
    }

    return group;
  }
});
