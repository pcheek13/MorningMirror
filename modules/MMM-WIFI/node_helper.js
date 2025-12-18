const NodeHelper = require("node_helper");
const ping = require("ping");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        console.log(this.name + " helper started ...");
    },

    socketNotificationReceived: function(notification, payload) {
        const config = payload.config;
        if (notification === "MMM_WIFI_CHECK_SIGNAL") {
            const self = this;
            ping.promise
                .probe(config.server, {
                    timeout: config.maxTimeout,
                })
                .then(pong => {
                    // console.log(pong);
                    self.sendSocketNotification(
                        "MMM_WIFI_RESULT_PING",
                        pong.time,
                    );
                })
                .catch(err => {
                    // console.log(err);
                    self.sendSocketNotification(
                        "MMM_WIFI_RESULT_PING",
                        9999,
                    );
                });
        } else if (notification === "MMM_WIFI_UPDATE_WIFI") {
            const ssid = String(payload?.ssid ?? "").trim();
            const password = String(payload?.password ?? "").trim();

            if (!ssid || ssid.length > 64 || password.length > 128) {
                this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                    success: false,
                    messageKey: "wifiUpdateFailed",
                    detail: "Invalid SSID or password",
                });
                return;
            }

            const command = config.wifiCommand || {};
            const executable = command.executable || "sudo";
            const moduleRoot = __dirname;
            const argsTemplate = Array.isArray(command.args) && command.args.length
                ? command.args
                : ["/usr/local/sbin/mm-set-wifi.sh", "{ssid}", "{password}"];
            const timeout = command.timeout || 20000;
            const maxBuffer = command.maxBuffer || 1024 * 1024;

            const processedArgs = argsTemplate.map(arg => {
                if (typeof arg !== "string") {
                    return arg;
                }

                const moduleResolved = arg.includes("{modulePath}")
                    ? arg.split("{modulePath}").reduce((accum, segment, index) => {
                        if (index === 0) {
                            return segment;
                        }

                        const normalized = path.join(moduleRoot, segment.replace(/^\/+/, ""));
                        return `${accum}${normalized}`;
                    }, "")
                    : arg;

                return moduleResolved
                    .replace("{ssid}", ssid)
                    .replace("{password}", password);
            });

            const finalExecutable = config.useSudoForWifiCommand && executable !== "sudo"
                ? "sudo"
                : executable;
            const finalArgs = config.useSudoForWifiCommand && executable !== "sudo"
                ? [executable, ...processedArgs]
                : processedArgs;

            const scriptPath = processedArgs[0];
            if (path.isAbsolute(scriptPath) && !fs.existsSync(scriptPath)) {
                this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                    success: false,
                    messageKey: "wifiUpdateFailed",
                    detail: `Wi-Fi helper script missing at ${scriptPath}`,
                });
                return;
            }

            execFile(finalExecutable, finalArgs, { timeout, maxBuffer }, (error, stdout = "", stderr = "") => {
                if (error) {
                    const detail = error.killed
                        ? `Wi-Fi helper timed out after ${timeout}ms. Ensure this user can run sudo without a password for the configured command.`
                        : stderr.trim() || error.message;

                    const permissionDenied = /sudo: a password is required/i.test(stderr);

                    this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                        success: false,
                        messageKey: permissionDenied ? "wifiPermissionDenied" : "wifiUpdateFailed",
                        detail,
                    });
                    return;
                }

                this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                    success: true,
                    messageKey: "wifiUpdateSuccess",
                    detail: stdout.trim(),
                });
            });
        }
    },
});
