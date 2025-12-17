/* global Module */

Module.register("MMM-DailyWeatherPrompt", {
  defaults: {
    location: "",
    units: "imperial", // 'imperial' (F) or 'metric' (C)
    updateInterval: 10 * 60 * 1000,
    showFeelsLike: true,
    showHumidity: true,
    showWind: true
  },

  start() {
    this.weather = null;
    this.error = null;
    this.loading = false;
    this.userLocation = this.config.location;
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

  createPrompt() {
    const wrapper = document.createElement("div");
    wrapper.className = "dwp-notice";
    wrapper.innerHTML = "Set your city, state, or ZIP from the Settings panel.";
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

    if (this.loading) {
      const loading = document.createElement("div");
      loading.className = "dwp-loading";
      loading.innerHTML = "Loading weather...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (!this.userLocation) {
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
  },

  notificationReceived(notification, payload) {
    if (notification === "LOCATION_UPDATED" && payload && payload.location) {
      this.userLocation = payload.location;
      this.saveLocation(payload.location);
      this.requestWeather();
      this.updateDom();
    }
  }
});
