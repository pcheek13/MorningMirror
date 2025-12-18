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

WIFI_DEV=$(nmcli -t -f DEVICE,TYPE dev status | awk -F: '$2=="wifi" {print $1; exit}')
if [[ -z "$WIFI_DEV" ]]; then
  echo "No Wi-Fi device found" >&2
  exit 5
fi

nmcli radio wifi on
nmcli device wifi rescan ifname "$WIFI_DEV" || true

PROFILE_EXISTS=false
if nmcli -g NAME connection show "$SSID" >/dev/null 2>&1; then
  PROFILE_EXISTS=true
fi

if [[ "$PROFILE_EXISTS" = false ]]; then
  nmcli connection add type wifi ifname "$WIFI_DEV" con-name "$SSID" ssid "$SSID" >/dev/null
fi

NETWORK_VISIBLE=$(nmcli -t -f SSID device wifi list ifname "$WIFI_DEV" | sed '/^$/d' | grep -Fx -- "$SSID" || true)
if [[ -z "$NETWORK_VISIBLE" ]]; then
  nmcli connection modify "$SSID" wifi.hidden yes
else
  nmcli connection modify "$SSID" wifi.hidden no
fi

nmcli connection modify "$SSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PASS"
nmcli connection up "$SSID" ifname "$WIFI_DEV"

echo "Wi-Fi credentials applied for '$SSID' via NetworkManager on $WIFI_DEV"
