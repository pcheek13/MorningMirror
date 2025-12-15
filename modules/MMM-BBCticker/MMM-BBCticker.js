/* global Module Log */

Module.register("MMM-BBCticker", {
  defaults: {
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    updateInterval: 10 * 60 * 1000,
    animationSpeed: 1000,
    tickerSpeed: 45,
    maxItems: 10,
    separator: " \u2022 ",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    textColor: "#ffffff",
    fontSize: "1.4rem",
    reloadOnSuspend: true
  },

  start() {
    this.newsItems = [];
    this.loaded = false;
    this.errorMessage = null;
    this.suspended = false;

    this.validateConfig();
    this.sendSocketNotification("MMM_BBCTICKER_CONFIG", this.config);
  },

  validateConfig() {
    if (typeof this.config.updateInterval !== "number" || this.config.updateInterval < 60 * 1000) {
      this.logWarn("MMM-BBCticker: updateInterval too low or not a number. Falling back to 10 minutes.");
      this.config.updateInterval = 10 * 60 * 1000;
    }

    if (typeof this.config.tickerSpeed !== "number" || this.config.tickerSpeed <= 0) {
      this.logWarn("MMM-BBCticker: tickerSpeed must be a positive number. Falling back to 45 seconds.");
      this.config.tickerSpeed = 45;
    }

    if (typeof this.config.maxItems !== "number" || this.config.maxItems <= 0) {
      this.logWarn("MMM-BBCticker: maxItems must be a positive number. Falling back to 10 items.");
      this.config.maxItems = 10;
    }
  },

  logWarn(message) {
    if (typeof Log !== "undefined" && Log.warn) {
      Log.warn(message);
    } else {
      // eslint-disable-next-line no-console
      console.warn(message);
    }
  },

  getStyles() {
    return ["MMM-BBCticker.css"];
  },

  getHeader() {
    return this.config.header || this.translate("TITLE");
  },

  getTranslations() {
    return {
      en: "translations/en.json"
    };
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-bbcticker-wrapper";

    if (this.config.backgroundColor) {
      wrapper.style.backgroundColor = this.config.backgroundColor;
    }

    if (this.config.textColor) {
      wrapper.style.color = this.config.textColor;
    }

    if (this.config.fontSize) {
      wrapper.style.fontSize = this.config.fontSize;
    }

    if (this.errorMessage) {
      wrapper.textContent = this.errorMessage;
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.textContent = this.translate("LOADING");
      return wrapper;
    }

    const ticker = document.createElement("div");
    ticker.className = "mmm-bbcticker-ticker";

    const content = document.createElement("div");
    content.className = "mmm-bbcticker-ticker-content";
    const duration = Math.max(1, this.config.tickerSpeed);
    content.style.animationDuration = `${duration}s`;

    if (this.newsItems.length === 0) {
      content.textContent = this.translate("NO_ITEMS");
    } else {
      this.newsItems.forEach((item, index) => {
        const titleSpan = document.createElement("span");
        titleSpan.className = "mmm-bbcticker-item";
        titleSpan.textContent = item.title;
        content.appendChild(titleSpan);

        if (index < this.newsItems.length - 1) {
          const separatorSpan = document.createElement("span");
          separatorSpan.className = "mmm-bbcticker-separator";
          separatorSpan.textContent = this.config.separator;
          content.appendChild(separatorSpan);
        }
      });
    }

    ticker.appendChild(content);
    wrapper.appendChild(ticker);

    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MMM_BBCTICKER_NEWS") {
      this.loaded = true;
      this.errorMessage = null;
      this.newsItems = payload.items || [];
      this.updateDom(this.config.animationSpeed);
    }

    if (notification === "MMM_BBCTICKER_ERROR") {
      this.loaded = true;
      this.errorMessage = payload.message || this.translate("ERROR");
      this.updateDom(this.config.animationSpeed);
    }
  },

  notificationReceived(notification) {
    if (notification === "SUSPEND") {
      this.suspended = true;
    }

    if (notification === "RESUME") {
      if (this.suspended && this.config.reloadOnSuspend) {
        this.sendSocketNotification("MMM_BBCTICKER_CONFIG", this.config);
      }
      this.suspended = false;
    }
  }
});
