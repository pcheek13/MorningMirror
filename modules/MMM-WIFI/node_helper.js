const NodeHelper = require("node_helper");
const ping = require("ping");
const { execFile } = require("child_process");

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
            const argsTemplate = Array.isArray(command.args) ? command.args : [];
            const timeout = command.timeout || 15000;

            const processedArgs = argsTemplate.map(arg =>
                arg.replace("{ssid}", ssid).replace("{password}", password),
            );

            const finalExecutable = config.useSudoForWifiCommand ? "sudo" : executable;
            const finalArgs = config.useSudoForWifiCommand
                ? [executable, ...processedArgs]
                : processedArgs;

            execFile(finalExecutable, finalArgs, { timeout }, error => {
                if (error) {
                    this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                        success: false,
                        messageKey: "wifiUpdateFailed",
                        detail: error.message,
                    });
                } else {
                    this.sendSocketNotification("MMM_WIFI_WIFI_UPDATE_STATUS", {
                        success: true,
                        messageKey: "wifiUpdateSuccess",
                    });
                }
            });
        }
    },
});
