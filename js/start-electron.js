"use strict";

const { spawnSync, spawn } = require("child_process");
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

const exitWithElectronHint = () => {
	console.error(
		"\nElectron is not installed. Re-run dependencies so the platform binary downloads:\n" +
		"  rm -rf node_modules/electron ~/.cache/electron && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev\n"
	);
	process.exit(1);
};

const verifyElectronBinary = () => {
	if (!fs.existsSync(electronBinary)) {
		exitWithElectronHint();
	}

	if (os.platform() !== "linux") {
		return;
	}

	const lddResult = spawnSync("ldd", [electronBinary], { encoding: "utf8" });

	if (lddResult.error || lddResult.status !== 0) {
		return;
	}

	const missingDeps = lddResult.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.includes("=> not found"));

	if (missingDeps.length === 0) {
		return;
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
};

const detectDisplay = () => {
	if (os.platform() !== "linux") {
		return { env: { ...process.env }, mode: "default" };
	}

	const env = { ...process.env };
	const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
	const defaultWayland = env.WAYLAND_DISPLAY || "wayland-1";
	const waylandSocket = path.join("/run/user", String(uid), defaultWayland);
	const wantsWayland =
		env.WAYLAND_DISPLAY || env.XDG_SESSION_TYPE === "wayland" || fs.existsSync(waylandSocket);

	if (wantsWayland) {
		env.WAYLAND_DISPLAY = defaultWayland;
		return { env, mode: "wayland" };
	}

	const defaultDisplay = env.DISPLAY || ":0";
	const xSocket = path.join("/tmp/.X11-unix", `X${defaultDisplay.replace(":", "")}`);
	const hasX11 = env.DISPLAY || fs.existsSync(xSocket);

	if (hasX11) {
		env.DISPLAY = defaultDisplay;
		return { env, mode: "x11" };
	}

	console.error(
		"\nNo display server detected. Start a graphical session first, then run MorningMirror:\n" +
		"  # Wayland (Raspberry Pi OS Bookworm default)\n" +
		"  export WAYLAND_DISPLAY=wayland-1\n" +
		"\n" +
		"  # X11\n" +
		"  export DISPLAY=:0\n"
	);
	process.exit(1);
};

const runElectron = ({ env, mode }) => {
	const args = [path.join("js", "electron.js"), ...process.argv.slice(2)];

	if (mode === "wayland") {
		args.unshift("--enable-features=UseOzonePlatform", "--ozone-platform=wayland");
	}

	const child = spawn(electronBinary, args, {
		stdio: "inherit",
		env,
	});

	child.on("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code);
	});
};

verifyElectronBinary();
const display = detectDisplay();
runElectron(display);
