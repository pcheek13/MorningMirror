const NodeHelper = require("node_helper");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  socketNotificationReceived(notification, payload) {
    if (notification === "MMM_MODULEBAR_REBOOT") {
      this.executeReboot(payload && payload.reason ? payload.reason : "User requested reboot");
    }
  },

  executeReboot(reason) {
    console.log(`MMM-Modulebar: reboot requested (${reason})`);
    exec("sudo reboot", (error, stdout, stderr) => {
      if (error) {
        console.error("MMM-Modulebar reboot failed", error, stderr);
      } else {
        console.log("MMM-Modulebar reboot triggered", stdout);
      }
    });
  }
});
