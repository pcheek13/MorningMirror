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
            const { ssid, password } = payload;
            const command = config.wifiCommand || {};
            const executable = command.executable || "nmcli";
            const moduleRoot = __dirname;
            const moduleScript = path.join(moduleRoot, "scripts", "update-wifi.sh");
            const argsTemplate = Array.isArray(command.args) && command.args.length
                ? command.args
                : ["{modulePath}/scripts/update-wifi.sh", "{ssid}", "{password}"];
            const timeout = command.timeout || 15000;

            const processedArgs = argsTemplate.map(arg =>
                arg
                    .replace("{modulePath}", moduleRoot)
                    .replace("{ssid}", ssid)
                    .replace("{password}", password),
            );

            if (!fs.existsSync(moduleScript)) {
                this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                    success: false,
                    messageKey: "wifiUpdateFailed",
                    detail: `Wi-Fi helper script missing at ${moduleScript}`,
                });
                return;
            }

            const finalExecutable = config.useSudoForWifiCommand ? "sudo" : executable;
            const finalArgs = config.useSudoForWifiCommand
                ? ["-n", executable, ...processedArgs]
                : processedArgs;

            execFile(finalExecutable, finalArgs, { timeout }, (error, stdout = "", stderr = "") => {
                if (error) {
                    const detail = error.killed
                        ? `Wi-Fi helper timed out after ${timeout}ms. Ensure this user can run sudo without a password.`
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
