/**
 * MorningMirror (and MorningMirror forks)
 * Module: MMM-WIFI
 *
 * By pcheek13 https://github.com/pcheek13/MMM-WIFI
 * MIT Licensed.
 */

Module.register("MMM-WIFI", {
    // Default module config
    defaults: {
        updateInterval: 1000 * 30, // check network every 30 seconds to avoid rapid blinking
        maxTimeout: 1000, // maximum timeout in ms before we assume the link is down
        animationSpeed: 0,
        initialLoadDelay: 1000 * 5, // first check delay
        server: "8.8.8.8", // Server to check network connection. Default 8.8.8.8 is a Google DNS server
        indicatorDuration: 0, // left for compatibility; indicator is now rendered inside settings only
        thresholds: {
            strong: 50,
            medium: 150,
            weak: 500,
        },
        allowWifiUpdates: true,
        wifiCommand: {
            executable: "sudo",
            args: ["/usr/local/sbin/mm-set-wifi.sh", "{ssid}", "{password}"],
            timeout: 20000,
            maxBuffer: 1024 * 1024,
        },
        useSudoForWifiCommand: true,
        settingsOnly: true, // hide the module from the main layout; it powers the settings panel indicator
    },

    getTranslations() {
        return {
            en: "translations/en.json",
        };
    },

    start() {
        Log.info("Starting module: " + this.name);
        this.ping = Number.MAX_SAFE_INTEGER;
        this.wifiUpdateStatus = "";
        this.isUpdating = false;

        setTimeout(() => {
            this.pingTest();
            setInterval(() => {
                this.pingTest();
            }, this.config.updateInterval);
        }, this.config.initialLoadDelay);

        // Let other modules know the initial status as soon as possible.
        this.broadcastStatus();
    },

    getDom() {
        const placeholder = document.createElement("div");
        placeholder.className = "mmm-wifi--settings-only";
        if (this.config.settingsOnly !== false) {
            placeholder.style.display = "none";
        }
        return placeholder;
    },

    pingTest() {
        this.sendSocketNotification("MMM_WIFI_CHECK_SIGNAL", {
            config: this.config,
        });
    },

    determineSignalStrength() {
        if (!Number.isFinite(this.ping) || this.ping >= this.config.maxTimeout) {
            return "none";
        }

        if (this.ping < this.config.thresholds.strong) {
            return "strong";
        }

        if (this.ping < this.config.thresholds.medium) {
            return "medium";
        }

        return "weak";
    },

    broadcastStatus(overrides = {}) {
        const payload = {
            ping: this.ping,
            strength: this.determineSignalStrength(),
            isUpdating: overrides.isUpdating ?? this.isUpdating,
            statusText: overrides.statusText ?? this.wifiUpdateStatus,
        };

        this.sendNotification("WIFI_STATUS_UPDATE", payload);
    },

    notificationReceived(notification, payload) {
        if (notification === "MIRROR_WAKE") {
            this.pingTest();
        }

        if (notification === "WIFI_CREDENTIALS_UPDATED" && payload && this.config.allowWifiUpdates) {
            const sanitized = {
                ssid: (payload.ssid || "").trim(),
                password: (payload.password || "").trim(),
            };

            if (!sanitized.ssid || !sanitized.password) {
                return;
            }

            this.isUpdating = true;
            this.wifiUpdateStatus = this.translate("wifiUpdatePending");
            this.broadcastStatus();

            this.sendSocketNotification("MMM_WIFI_UPDATE_WIFI", {
                ssid: sanitized.ssid,
                password: sanitized.password,
                config: this.config,
            });
        }
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "MMM_WIFI_RESULT_PING") {
            this.ping = payload;
            this.broadcastStatus();
        }

        if (notification === "MMM_WIFI_WIFI_UPDATE_STATUS") {
            const message = payload && payload.messageKey ? this.translate(payload.messageKey) : "";
            const detail = payload && payload.detail ? `: ${payload.detail}` : "";
            this.wifiUpdateStatus = `${message}${detail}`;
            this.isUpdating = false;
            this.broadcastStatus();
        }
    },
});
