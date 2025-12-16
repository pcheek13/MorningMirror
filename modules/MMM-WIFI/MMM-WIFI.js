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
        maxTimeout: 1000, // maximum timeout
        animationSpeed: 0, // disable fade effect to prevent flicker
        initialLoadDelay: 1000 * 5, // first check delay
        server: "8.8.8.8", // Server to check network connection. Default 8.8.8.8 is a Google DNS server
        showMessage: true,
        thresholds: {
            strong: 50,
            medium: 150,
            weak: 500,
        },
        flexDirection: 'row', // set to 'row' to display the row in left-to-right mode, 'row-reverse' to display the row in right-to-left mode
        scale: 0.45, // scale for the icon, must be greater than 0
        touchTargetSize: 96, // minimum square size (px) for the tap target around the Wi-Fi icon
        allowWifiUpdates: true,
        showVirtualKeyboard: true, // show a simple on-screen keyboard for SSID/password input
        wifiCommand: {
            executable: "/bin/bash",
            args: ["{modulePath}/scripts/update-wifi.sh", "{ssid}", "{password}"],
            timeout: 20000,
        },
        useSudoForWifiCommand: true,
    },
    getTranslations: function() {
        return {
            en: "translations/en.json",
        };
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        const self = this;
        this.ping = Number.MAX_SAFE_INTEGER;
        this.wifiUpdateStatus = "";
        this.formVisible = false;
        this.activeInput = null;
        this.keyboardVisible = false;
        this.keyboardShift = false;
        this.formData = { ssid: "", password: "" };

        setTimeout(() => {
            self.pingTest();
            setInterval(() => {
                self.pingTest();
            }, self.config.updateInterval); // Actual loop timing
        }, self.config.initialLoadDelay); // First delay
    },

    getDom: function() {
        const content = document.createElement("div");
        content.style = `display: flex;flex-direction: ${this.config.flexDirection};justify-content: space-between; align-items: center; gap: 8px;`;
        content.style.pointerEvents = "auto";
        const pointerStyle = this.config.allowWifiUpdates ? "cursor: pointer;" : "";

        const wifiButton = document.createElement("button");
        wifiButton.type = "button";
        wifiButton.tabIndex = 0;
        wifiButton.setAttribute("aria-label", this.translate("configureWifiTitle"));
        wifiButton.style = `border:none;background:transparent;display:flex;align-items:center;justify-content:center;padding:10px;`
            + `width:${this.config.touchTargetSize}px;height:${this.config.touchTargetSize}px;`
            + `border-radius:12px;${pointerStyle}touch-action:manipulation;pointer-events:auto;user-select:none;`;
        wifiButton.setAttribute("aria-expanded", String(this.formVisible));
        wifiButton.setAttribute("aria-controls", "mmm-wifi-config-form");

        const wifiSign = document.createElement("img");
        wifiSign.draggable = false;
        wifiSign.style = `transform:scale(${this.config.scale});width:100%;height:100%;object-fit:contain;${pointerStyle}`;
        if (this.config.showMessage)
        {
            var connStatus = document.createElement("p");
            connStatus.style = "text-align:center;font-size:0.65em";
        }

        // Changing icon
        switch (true) {
            // Fast ping, strong signal
            case this.ping < this.config.thresholds.strong:
                wifiSign.src = this.file("icons/3.png");
                if (this.config.showMessage)
                {
                    connStatus.innerHTML = this.translate("excellent")
                }
                break;
            // Medium ping, medium signal
            case this.ping < this.config.thresholds.medium:
                wifiSign.src = this.file("icons/2.png");
                if (this.config.showMessage)
                {
                    connStatus.innerHTML = this.translate("good")
                }
                break;
            // Slow ping, weak signal
            case this.ping < this.config.thresholds.weak:
                wifiSign.src = this.file("icons/1.png");
                if (this.config.showMessage)
                {
                    connStatus.innerHTML = this.translate("normal")
                }
                break;
            // Ultraslow ping, better if "no signal"
            case this.ping > this.config.thresholds.weak:
                wifiSign.src = this.file("icons/0.png");
                if (this.config.showMessage)
                {
                    connStatus.innerHTML = this.translate("bad")
                }
                break;
            // No actual ping, maybe just searching for signal
            default:
                wifiSign.src = this.file("icons/loading.gif");
                break;
        }

        if (this.config.showMessage)
        {
            content.appendChild(connStatus);
        }
        wifiButton.appendChild(wifiSign);
        content.appendChild(wifiButton);

        if (this.config.allowWifiUpdates) {
            wifiSign.title = this.translate("configureWifiTitle");
            const toggleForm = event => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                this.formVisible = !this.formVisible;
                wifiButton.setAttribute("aria-expanded", String(this.formVisible));
                this.updateDom(this.config.animationSpeed);
            };

            wifiButton.addEventListener("click", toggleForm, { passive: false });
            wifiButton.addEventListener("touchend", toggleForm, { passive: false });
            wifiButton.addEventListener("keydown", event => {
                if (event.code === "Space" || event.code === "Enter") {
                    toggleForm(event);
                }
            });

            const formWrapper = document.createElement("div");
            formWrapper.id = "mmm-wifi-config-form";
            formWrapper.style = `display: ${this.formVisible ? "flex" : "none"}; flex-direction: column; gap: 4px; font-size: 0.65em; max-width: 220px;`;
            const heading = document.createElement("div");
            heading.style = "font-weight:bold";
            heading.innerHTML = this.translate("configureWifiTitle");
            formWrapper.appendChild(heading);

            const description = document.createElement("div");
            description.style = "line-height:1.3";
            description.innerHTML = this.translate("configureWifiDescription");
            formWrapper.appendChild(description);

            const form = document.createElement("form");
            form.style = "display:flex; flex-direction:column; gap:4px;";

            const ssid = document.createElement("input");
            ssid.type = "text";
            ssid.placeholder = this.translate("ssidPlaceholder");
            ssid.required = true;
            ssid.value = this.formData.ssid;

            const password = document.createElement("input");
            password.type = "password";
            password.placeholder = this.translate("passwordPlaceholder");
            password.required = true;
            password.value = this.formData.password;

            const submit = document.createElement("button");
            submit.type = "submit";
            submit.innerHTML = this.translate("submitWifi");

            form.appendChild(ssid);
            form.appendChild(password);
            form.appendChild(submit);

            const keyboardWrapper = document.createElement("div");
            keyboardWrapper.style = `display:${this.keyboardVisible && this.config.showVirtualKeyboard ? "flex" : "none"};` +
                "flex-direction:column; gap:4px; margin-top:4px; max-width:240px;";

            const keyboardState = { shift: this.keyboardShift };
            const setActiveInput = input => {
                this.activeInput = input;
                if (this.config.showVirtualKeyboard) {
                    this.keyboardVisible = true;
                    keyboardWrapper.style.display = "flex";
                }
            };

            if (this.config.showVirtualKeyboard) {
                ssid.addEventListener("focus", () => setActiveInput(ssid));
                password.addEventListener("focus", () => setActiveInput(password));
            }

            ssid.addEventListener("input", () => {
                this.formData.ssid = ssid.value;
            });
            password.addEventListener("input", () => {
                this.formData.password = password.value;
            });

            form.addEventListener("submit", event => {
                event.preventDefault();
                const trimmedSsid = ssid.value.trim();
                const trimmedPassword = password.value.trim();
                if (!trimmedSsid || !trimmedPassword) {
                    this.wifiUpdateStatus = this.translate("wifiMissingFields");
                    this.updateDom(this.config.animationSpeed);
                    return;
                }

                this.formData = { ssid: trimmedSsid, password: trimmedPassword };

                this.wifiUpdateStatus = this.translate("wifiUpdatePending");
                this.sendSocketNotification("MMM_WIFI_UPDATE_WIFI", {
                    ssid: trimmedSsid,
                    password: trimmedPassword,
                    config: this.config,
                });
                this.updateDom(this.config.animationSpeed);
            });

            formWrapper.appendChild(form);

            if (this.config.showVirtualKeyboard) {
                const keyboardRows = [
                    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
                    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
                    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"],
                    ["⇧", "z", "x", "c", "v", "b", "n", "m", "-", "_"],
                    ["space", "clear", "hide"],
                ];

                const keyButtons = [];
                const insertAtCursor = char => {
                    if (!this.activeInput) return;
                    const start = this.activeInput.selectionStart || 0;
                    const end = this.activeInput.selectionEnd || 0;
                    const current = this.activeInput.value;
                    this.activeInput.value = `${current.slice(0, start)}${char}${current.slice(end)}`;
                    const cursor = start + char.length;
                    this.activeInput.setSelectionRange(cursor, cursor);
                    this.activeInput.focus();
                };

                const backspace = () => {
                    if (!this.activeInput) return;
                    const start = this.activeInput.selectionStart || 0;
                    const end = this.activeInput.selectionEnd || 0;
                    const current = this.activeInput.value;
                    if (start === end && start > 0) {
                        const nextPos = start - 1;
                        this.activeInput.value = `${current.slice(0, start - 1)}${current.slice(end)}`;
                        this.activeInput.setSelectionRange(nextPos, nextPos);
                    } else if (start !== end) {
                        this.activeInput.value = `${current.slice(0, start)}${current.slice(end)}`;
                        this.activeInput.setSelectionRange(start, start);
                    }
                    this.activeInput.focus();
                };

                const refreshLabels = () => {
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
                            button.textContent = keyboardState.shift ? "⇧ (on)" : "⇧";
                        } else {
                            button.textContent = keyboardState.shift ? key.toUpperCase() : key;
                        }
                    });
                };

                keyboardRows.forEach(row => {
                    const rowEl = document.createElement("div");
                    rowEl.style = "display:flex; gap:4px;";
                    row.forEach(key => {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.style = "min-width:38px; padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.08); color:inherit;";
                        button.addEventListener("click", () => {
                            if (!this.activeInput) {
                                return;
                            }
                            if (key === "space") {
                                insertAtCursor(" ");
                                return;
                            }
                            if (key === "clear") {
                                this.activeInput.value = "";
                                this.activeInput.focus();
                                return;
                            }
                            if (key === "hide") {
                                this.keyboardVisible = false;
                                keyboardWrapper.style.display = "none";
                                this.activeInput = null;
                                return;
                            }
                            if (key === "⌫") {
                                backspace();
                                return;
                            }
                            if (key === "⇧") {
                                keyboardState.shift = !keyboardState.shift;
                                this.keyboardShift = keyboardState.shift;
                                refreshLabels();
                                return;
                            }
                            const charToInsert = keyboardState.shift ? key.toUpperCase() : key;
                            insertAtCursor(charToInsert);
                        });
                        keyButtons.push({ button, key });
                        rowEl.appendChild(button);
                    });
                    keyboardWrapper.appendChild(rowEl);
                });

                refreshLabels();
                formWrapper.appendChild(keyboardWrapper);
            }

            if (this.wifiUpdateStatus) {
                const status = document.createElement("div");
                status.style = "line-height:1.3";
                status.textContent = this.wifiUpdateStatus;
                formWrapper.appendChild(status);
            }

            content.appendChild(formWrapper);
        }
        return content;
    },

    // Send socket notification, to start pinging the server
    pingTest: function() {
        this.sendSocketNotification("MMM_WIFI_CHECK_SIGNAL", {
            config: this.config,
        });
    },

    // Handle socket answer
    socketNotificationReceived: function(notification, payload) {
        // Care only own socket answers
        if (notification === "MMM_WIFI_RESULT_PING") {
            this.ping = payload;
            if (this.formVisible && (this.activeInput || this.keyboardVisible)) {
                return;
            }
            this.updateDom(this.config.animationSpeed);
        } else if (notification === "MMM_WIFI_WIFI_UPDATE_STATUS") {
            const message = payload && payload.messageKey ? this.translate(payload.messageKey) : "";
            const detail = payload && payload.detail ? `: ${payload.detail}` : "";
            this.wifiUpdateStatus = `${message}${detail}`;
            this.formVisible = true;
            this.updateDom(this.config.animationSpeed);
        }
    },
});
