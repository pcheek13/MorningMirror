const { exec } = require("child_process");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start() {
    console.log(`${this.name} helper started ...`);
  },

  socketNotificationReceived(notification, payload = {}) {
    if (notification === "HAMBURGER_REBOOT") {
      this.handleReboot(payload);
      return;
    }

    if (notification === "HAMBURGER_PULL") {
      this.handleGitPull(payload);
    }
  },

  handleReboot(payload) {
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

  handleGitPull(payload) {
    const command =
      payload.command ||
      "cd ~/MorningMirror && git pull --ff-only";

    exec(command, { env: process.env }, (error, stdout = "", stderr = "") => {
      if (error) {
        const detail = stderr.trim() || error.message;
        this.sendSocketNotification("HAMBURGER_PULL_FAILED", {
          message: detail,
        });
        return;
      }

      this.sendSocketNotification("HAMBURGER_PULL_FINISHED", {
        message: stdout.trim(),
      });
    });
  },
});
