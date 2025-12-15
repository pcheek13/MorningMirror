/* global Module */

Module.register("MMM-DailyWeatherPrompt", {
  defaults: {
    location: "",
    units: "imperial", // 'imperial' (F) or 'metric' (C)
    updateInterval: 10 * 60 * 1000,
    promptText: "Enter City, ST or ZIP",
    showFeelsLike: true,
    showHumidity: true,
    showWind: true,
    allowLocationChange: true
  },

  start() {
    this.weather = null;
    this.error = null;
    this.loading = false;
    this.userLocation = this.config.location;
    this.isEditing = false;
    this.keypadMode = "numeric";
    this.storageKey = "MMM-DailyWeatherPrompt::location";

    this.restoreLocation();
    if (this.userLocation) {
      this.requestWeather();
    }

    this.scheduleUpdate();
  },

  getStyles() {
    return ["MMM-DailyWeatherPrompt.css"];
  },

  restoreLocation() {
    if (!this.config.location && typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.userLocation = stored;
      }
    }
  },

  saveLocation(location) {
    if (typeof localStorage !== "undefined" && location) {
      localStorage.setItem(this.storageKey, location);
    }
  },

  getTranslations() {
    return false;
  },

  scheduleUpdate() {
    if (this.config.updateInterval > 0) {
      setInterval(() => {
        if (this.userLocation) {
          this.requestWeather();
        }
      }, this.config.updateInterval);
    }
  },

  requestWeather() {
    if (!this.userLocation) {
      return;
    }

    this.error = null;
    this.loading = true;
    this.updateDom();

    this.sendSocketNotification("FETCH_WEATHER", {
      location: this.userLocation,
      units: this.config.units
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "WEATHER_RESULT" && payload) {
      if (payload.error) {
        this.error = payload.error;
        this.weather = null;
      } else {
        this.weather = payload;
        this.error = null;
      }
      this.loading = false;
      this.updateDom();
    }
  },

  setLocationFromInput(input) {
    const value = input.value.trim();
    if (!value) {
      this.error = "Please enter a location.";
      this.updateDom();
      return;
    }

    this.userLocation = value;
    this.isEditing = false;
    this.saveLocation(value);
    this.requestWeather();
  },

  handleKeypadInput(input, value) {
    if (!input) {
      return;
    }

    if (value === "BACKSPACE") {
      input.value = input.value.slice(0, -1);
      return;
    }

    if (value === "CLEAR") {
      input.value = "";
      return;
    }

    input.value += value;
  },

  createPrompt() {
    const wrapper = document.createElement("div");
    wrapper.className = "dwp-prompt";

    const label = document.createElement("div");
    label.className = "dwp-label";
    label.innerHTML = this.config.promptText;
    wrapper.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "dwp-input";
    input.placeholder = this.config.promptText;
    input.value = this.userLocation || "";
    wrapper.appendChild(input);

    const button = document.createElement("button");
    button.className = "dwp-button";
    button.innerHTML = this.userLocation ? "Update" : "Save";
    button.addEventListener("click", () => this.setLocationFromInput(input));
    wrapper.appendChild(button);

    const keypadSection = document.createElement("div");
    keypadSection.className = "dwp-keypad";

    const toggleRow = document.createElement("div");
    toggleRow.className = "dwp-keypad-toggle";

    const toggleLabel = document.createElement("div");
    toggleLabel.className = "dwp-keypad-label";
    toggleLabel.innerHTML = "Touch keypad";
    toggleRow.appendChild(toggleLabel);

    const toggleButtons = document.createElement("div");
    toggleButtons.className = "dwp-toggle-group";

    const numericBtn = document.createElement("button");
    numericBtn.className = "dwp-toggle";
    numericBtn.innerHTML = "ZIP";

    const alphaBtn = document.createElement("button");
    alphaBtn.className = "dwp-toggle";
    alphaBtn.innerHTML = "Letters";

    const updateToggleState = () => {
      if (this.keypadMode === "numeric") {
        numericBtn.classList.add("active");
        alphaBtn.classList.remove("active");
      } else {
        alphaBtn.classList.add("active");
        numericBtn.classList.remove("active");
      }
    };

    numericBtn.addEventListener("click", () => {
      this.keypadMode = "numeric";
      this.updateDom();
    });

    alphaBtn.addEventListener("click", () => {
      this.keypadMode = "alpha";
      this.updateDom();
    });

    updateToggleState();

    toggleButtons.appendChild(numericBtn);
    toggleButtons.appendChild(alphaBtn);
    toggleRow.appendChild(toggleButtons);
    keypadSection.appendChild(toggleRow);

    const keysGrid = document.createElement("div");
    keysGrid.className = "dwp-keys";

    const addKeyButton = (label, value = label) => {
      const keyBtn = document.createElement("button");
      keyBtn.className = "dwp-key";
      keyBtn.innerHTML = label;
      keyBtn.addEventListener("click", () => this.handleKeypadInput(input, value));
      keysGrid.appendChild(keyBtn);
    };

    if (this.keypadMode === "numeric") {
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].forEach((digit) => addKeyButton(digit));
    } else {
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].forEach((letter) => addKeyButton(letter));
      addKeyButton("Space", " ");
    }

    addKeyButton("←", "BACKSPACE");
    addKeyButton("Clear", "CLEAR");

    keypadSection.appendChild(keysGrid);
    wrapper.appendChild(keypadSection);

    input.addEventListener("keyup", (evt) => {
      if (evt.key === "Enter") {
        this.setLocationFromInput(input);
      }
    });

    if (this.isEditing && this.userLocation) {
      const cancel = document.createElement("button");
      cancel.className = "dwp-inline-btn dwp-cancel";
      cancel.innerHTML = "Cancel";
      cancel.addEventListener("click", () => {
        this.isEditing = false;
        this.error = null;
        this.updateDom();
      });
      wrapper.appendChild(cancel);
    }

    if (this.error) {
      const error = document.createElement("div");
      error.className = "dwp-error";
      error.innerHTML = this.error;
      wrapper.appendChild(error);
    }

    return wrapper;
  },

  createHeader(location) {
    const header = document.createElement("div");
    header.className = "dwp-header";

    const title = document.createElement("div");
    title.className = "dwp-title";
    title.innerHTML = location;
    header.appendChild(title);

    return header;
  },

  createWeatherRow(label, value, cssClass = "") {
    const row = document.createElement("div");
    row.className = `dwp-row ${cssClass}`.trim();

    const left = document.createElement("div");
    left.className = "dwp-row-label";
    left.innerHTML = label;
    row.appendChild(left);

    const right = document.createElement("div");
    right.className = "dwp-row-value";
    right.innerHTML = value;
    row.appendChild(right);

    return row;
  },

  renderWeather() {
    if (!this.weather) {
      return this.createPrompt();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "dwp-weather";

    wrapper.appendChild(this.createHeader(this.weather.locationName));

    const summary = document.createElement("div");
    summary.className = "dwp-summary";
    summary.innerHTML = this.weather.summary;
    wrapper.appendChild(summary);

    const temps = document.createElement("div");
    temps.className = "dwp-temps";
    temps.innerHTML = `<span class="dwp-temp-now">${this.weather.temperature}&deg;</span>` +
      `<span class="dwp-temp-range">H ${this.weather.high}&deg; / L ${this.weather.low}&deg;</span>`;
    wrapper.appendChild(temps);

    if (this.config.showFeelsLike) {
      wrapper.appendChild(this.createWeatherRow("Feels like", `${this.weather.feelsLike}°`));
    }

    if (this.config.showHumidity) {
      wrapper.appendChild(this.createWeatherRow("Humidity", `${this.weather.humidity}%`));
    }

    if (this.config.showWind) {
      wrapper.appendChild(this.createWeatherRow("Wind", `${this.weather.windSpeed} ${this.weather.windUnit}`));
    }

    const footer = document.createElement("div");
    footer.className = "dwp-footer";

    const updated = document.createElement("div");
    updated.className = "dwp-updated";
    updated.innerHTML = `Updated ${this.weather.updated}`;
    footer.appendChild(updated);

    if (this.config.allowLocationChange) {
      const gear = document.createElement("button");
      gear.className = "dwp-inline-btn dwp-gear";
      gear.innerHTML = "⚙";
      gear.title = "Change location";
      gear.setAttribute("aria-label", "Change location");
      gear.addEventListener("click", () => {
        this.isEditing = true;
        this.error = null;
        this.updateDom();
      });
      footer.appendChild(gear);
    }

    wrapper.appendChild(footer);

    if (Array.isArray(this.weather.forecast) && this.weather.forecast.length) {
      wrapper.appendChild(this.renderForecast(this.weather.forecast));
    }

    return wrapper;
  },

  renderForecast(days) {
    const container = document.createElement("div");
    container.className = "dwp-forecast";

    const title = document.createElement("div");
    title.className = "dwp-forecast-title";
    title.innerHTML = "Next 5 days";
    container.appendChild(title);

    const list = document.createElement("div");
    list.className = "dwp-forecast-list";

    days.forEach((day) => {
      const row = document.createElement("div");
      row.className = "dwp-forecast-row";

      const label = document.createElement("div");
      label.className = "dwp-forecast-day";
      label.innerHTML = day.label || "--";
      row.appendChild(label);

      const summary = document.createElement("div");
      summary.className = "dwp-forecast-summary";
      summary.innerHTML = day.summary || "";
      row.appendChild(summary);

      const temps = document.createElement("div");
      temps.className = "dwp-forecast-temps";
      temps.innerHTML = `H ${day.high}&deg; / L ${day.low}&deg;`;
      row.appendChild(temps);

      list.appendChild(row);
    });

    container.appendChild(list);
    return container;
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "dwp-container";

    if (this.loading && !this.isEditing) {
      const loading = document.createElement("div");
      loading.className = "dwp-loading";
      loading.innerHTML = "Loading weather...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (!this.userLocation || this.isEditing) {
      wrapper.appendChild(this.createPrompt());
      return wrapper;
    }

    if (this.error) {
      const error = document.createElement("div");
      error.className = "dwp-error";
      error.innerHTML = this.error;
      wrapper.appendChild(error);
      wrapper.appendChild(this.createPrompt());
      return wrapper;
    }

    if (!this.weather) {
      const pending = document.createElement("div");
      pending.className = "dwp-loading";
      pending.innerHTML = "Waiting for weather...";
      wrapper.appendChild(pending);
      return wrapper;
    }

    wrapper.appendChild(this.renderWeather());
    return wrapper;
  }
});
