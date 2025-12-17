#!/bin/bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

SSID="$1"
PASSWORD="$2"
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
WPA_INTERFACE="${WPA_INTERFACE:-wlan0}"
BACKUP_SUFFIX=$(date +%Y%m%d%H%M%S)
BACKUP_PATH="${WPA_CONF}.${BACKUP_SUFFIX}.bak"
TMP_NETWORK=$(mktemp)
TMP_CONF=$(mktemp)

cleanup() {
  rm -f "$TMP_NETWORK" "$TMP_CONF"
}

trap cleanup EXIT

if [[ "$EUID" -ne 0 ]]; then
  if ! sudo -n true 2>/dev/null; then
    echo "Passwordless sudo is required to update Wi-Fi." >&2
    exit 3
  fi
fi

# Ensure the configuration file exists and is writable
sudo install -d -m 755 /etc/wpa_supplicant
if [[ ! -f "$WPA_CONF" ]]; then
  echo "Creating missing $WPA_CONF with defaults"
  sudo tee "$WPA_CONF" >/dev/null <<'CFG'
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US
CFG
fi

# Create a hashed network block from the provided credentials
if ! command -v wpa_passphrase >/dev/null 2>&1; then
  echo "wpa_passphrase command not found. Please install wpa_supplicant." >&2
  exit 2
fi

wpa_passphrase "$SSID" "$PASSWORD" > "$TMP_NETWORK"

# Backup existing configuration and rebuild the file with only the new network
sudo cp "$WPA_CONF" "$BACKUP_PATH"

# Strip all existing network blocks so the new credentials become the only active Wi-Fi profile
sudo awk '
  /^\s*network\s*=\s*\{/ { in_network = 1; next }
  in_network {
    if ($0 ~ /^\s*\}/) { in_network = 0 }
    next
  }
  { print }
' "$WPA_CONF" | sudo tee "$TMP_CONF" >/dev/null

if [[ ! -s "$TMP_CONF" ]]; then
  COUNTRY_LINE=$(grep -m1 '^country=' "$WPA_CONF" 2>/dev/null || echo "country=US")
  cat <<CFG | sudo tee "$TMP_CONF" >/dev/null
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
${COUNTRY_LINE}
CFG
fi

{
  echo "# Added by MMM-WIFI on $(date)"
  cat "$TMP_NETWORK"
} | sudo tee -a "$TMP_CONF" >/dev/null

sudo install -m 600 "$TMP_CONF" "$WPA_CONF"

# Reconfigure Wi-Fi and restart MorningMirror
if ! timeout 15s sudo wpa_cli -i "$WPA_INTERFACE" reconfigure; then
  echo "wpa_cli reconfigure failed or timed out; restarting wpa_supplicant" >&2
  sudo systemctl restart wpa_supplicant.service
fi

PM2_PROCESS_NAME=${PM2_PROCESS_NAME:-morningmirror}
if command -v pm2 >/dev/null 2>&1; then
  if sudo pm2 describe "$PM2_PROCESS_NAME" >/dev/null 2>&1; then
    sudo pm2 restart "$PM2_PROCESS_NAME" --update-env || \
      echo "Warning: pm2 restart failed; restart MorningMirror manually" >&2
  else
    echo "Warning: pm2 process '$PM2_PROCESS_NAME' not found. Start MorningMirror with pm2 or set PM2_PROCESS_NAME." >&2
  fi
else
  echo "Warning: pm2 not installed; restart MorningMirror manually after updating Wi-Fi." >&2
fi

echo "Wi-Fi credentials for '$SSID' applied. Backup saved to $BACKUP_PATH"
