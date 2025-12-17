const { exec } = require("child_process");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start() {
    console.log(`${this.name} helper started ...`);
  },

  socketNotificationReceived(notification, payload = {}) {
    if (notification !== "HAMBURGER_REBOOT") {
      return;
    }

    const command = payload.command || "sudo /sbin/reboot";
    const child = exec(command, (error, stdout = "", stderr = "") => {
      if (error) {
        const detail = stderr.trim() || error.message;
        this.sendSocketNotification("HAMBURGER_REBOOT_FAILED", {
          message: detail,
        });
        return;
      }

      const detail = stdout.trim();
      this.sendSocketNotification("HAMBURGER_REBOOT_STARTED", { detail });
    });

    child.unref();
  },
});
