#!/usr/bin/env bash
set -euo pipefail

SSID="${1:-}"
PASS="${2:-}"

if [[ $(id -u) -ne 0 ]]; then
  echo "This helper must run as root (via sudo)." >&2
  exit 3
fi

if [[ -z "$SSID" ]]; then
  echo "SSID required" >&2
  exit 2
fi

if ! command -v nmcli >/dev/null 2>&1; then
  echo "nmcli is required to manage Wi-Fi on Bookworm." >&2
  exit 4
fi

nmcli radio wifi on
nmcli dev wifi connect "$SSID" password "$PASS"

echo "Wi-Fi credentials applied for '$SSID' via NetworkManager"
