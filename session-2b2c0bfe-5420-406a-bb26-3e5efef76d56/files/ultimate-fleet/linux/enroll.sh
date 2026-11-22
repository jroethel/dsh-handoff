#!/usr/bin/env bash
# enroll.sh — put one roster project under systemd on this VPS as ultimate@<name>.
#
# Reads the project's machine=vps entry from <kit>/wiring/fleet.json (path,
# port), then: $HOME/fleet/<name> -> project path (symlink), $HOME/fleet/<name>.env
# with ULTIMATE_PORT, daemon-reload, enable --now, linger, HTTP probe.
#
# RUN LOCATION: ON THE VPS.  Prereqs: provision-vps.sh completed (unit rendered,
# ultimate on PATH); tailscale up so the extension can publish the HTTPS URL.
#
# Usage: ./enroll.sh <name> [more names...]
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROSTER="$KIT/wiring/fleet.json"
command -v jq >/dev/null || { echo "jq required (sudo apt-get install -y jq)"; exit 1; }
[[ -f "$ROSTER" ]] || { echo "roster not found: $ROSTER"; exit 1; }

mkdir -p "$HOME/fleet"

for NAME in "$@"; do
  ROW=$(jq -r --arg n "$NAME" '.projects[] | select(.name == $n and .machine == "vps")' "$ROSTER")
  [[ -n "$ROW" ]] || { echo "no vps entry named '$NAME' in $ROSTER"; exit 1; }
  PATH_DIR=$(jq -r '.path' <<<"$ROW")
  PORT=$(jq -r '.port' <<<"$ROW")

  [[ -d "$PATH_DIR" ]] || { echo "project path missing: $PATH_DIR"; exit 1; }

  ln -sfn "$PATH_DIR" "$HOME/fleet/$NAME"
  printf 'ULTIMATE_PORT=%s\n' "$PORT" > "$HOME/fleet/$NAME.env"

  systemctl --user daemon-reload
  systemctl --user enable --now "ultimate@$NAME"

  sudo loginctl enable-linger "$USER" 2>/dev/null || \
    echo ">> could not enable linger (needs sudo): sudo loginctl enable-linger $USER"

  printf 'waiting for %s on port %s' "$NAME" "$PORT"
  for _ in $(seq 1 30); do
    CODE=$(curl -m 2 -s -o /dev/null -w '%{http_code}' -X POST \
      "http://127.0.0.1:$PORT/api/extensions/status/actions/status" \
      -H 'Content-Type: application/json' -d '{"args": {}}' || true)
    [[ "$CODE" == "200" ]] && break
    printf '.'; sleep 2
  done
  echo
  if [[ "$CODE" == "200" ]]; then
    echo "$NAME: healthy on 127.0.0.1:$PORT"
  else
    echo "$NAME: no answer yet — check: journalctl --user -u ultimate@$NAME -n 50"
    exit 1
  fi
done

echo
echo "Tailnet URL per project (once tailscale serve registers it): https://<this machine's dns>:<port>"
echo "Watch it:    journalctl --user -u ultimate@$NAME -f"
echo "Provider login + project trust happen in that project's UI once."
