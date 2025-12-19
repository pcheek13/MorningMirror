"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const electronBinary = path.join(
	__dirname,
	"..",
	"node_modules",
	"electron",
	"dist",
	os.platform() === "win32" ? "electron.exe" : "electron"
);

// If Electron is missing entirely, fail fast with a clear reinstall hint.
if (!fs.existsSync(electronBinary)) {
	console.error(
		"\nElectron is not installed. Re-run dependencies so the platform binary downloads:\n" +
		'  rm -rf node_modules/electron ~/.cache/electron && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev\n'
	);
	process.exit(1);
}

// Only Linux requires the shared library probe; other platforms keep the old flow.
if (os.platform() !== "linux") {
	process.exit(0);
}

if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
	console.error(
		"\nNo display server detected (DISPLAY or WAYLAND_DISPLAY is unset).\n" +
		"Set DISPLAY=:0 for X11 or WAYLAND_DISPLAY=wayland-1 for Wayland before starting MorningMirror.\n"
	);
	process.exit(1);
}

const lddResult = spawnSync("ldd", [electronBinary], { encoding: "utf8" });

// If ldd is unavailable, allow startup to continue instead of blocking.
if (lddResult.error || lddResult.status !== 0) {
	process.exit(0);
}

const missingDeps = lddResult.stdout
	.split("\n")
	.map((line) => line.trim())
	.filter((line) => line.includes("=> not found"));

if (missingDeps.length === 0) {
	process.exit(0);
}

console.error(
	"\nElectron is installed, but these system libraries are missing:\n" +
	`${missingDeps.join("\n")}\n\n` +
	"Install the Chromium/Electron runtime dependencies, then start MorningMirror again:\n" +
	"  sudo apt update && sudo apt install -y \\\n" +
	"    libatk1.0-0 libatk-bridge2.0-0 libnss3 libgbm1 libx11-xcb1 libxcb-dri3-0 \\\n" +
	"    libgtk-3-0 libasound2 libpangocairo-1.0-0 libatspi2.0-0 libdrm2 libxcomposite1 \\\n" +
	"    libxdamage1 libxrandr2\n"
);
process.exit(1);
