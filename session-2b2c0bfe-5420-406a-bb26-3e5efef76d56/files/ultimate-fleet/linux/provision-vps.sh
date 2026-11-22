#!/usr/bin/env bash
# provision-vps.sh — one-shot setup of a fresh Ubuntu VPS as a fleet machine.
#
# WHAT IT INSTALLS (with sudo, marked as it goes):
#   curl/ca-certificates, git >= 2.54 (git-core PPA when the distro ships older),
#   Node 26 (NodeSource), pnpm, Google Chrome (the browser/screenshot tools need
#   a Chromium; Chrome is the least flaky headless option), Tailscale.
# THEN, without sudo:
#   clones Ultimate to $ULTIMATE_CLONE (default ~/ultimate), pnpm install,
#   pnpm add -g (the `ultimate` command), renders ultimate@.service into
#   ~/.config/systemd/user/, writes ~/.ultimate/settings.json with the
#   tailscale extension enabled and your allowlist entry.
#
# RUN LOCATION: ON THE VPS.  Prereqs: an Ubuntu 24.04 user with sudo; the kit
# copied to the box (scp -r ultimate-fleet user@vps:~/fleet-kit) unless you
# only want dependencies.  Interactive steps left to you (printed at the end):
#   sudo tailscale up            (paste the auth URL in your browser)
#   enable HTTPS certificates in the Tailscale admin console (DNS page)
#
# Usage:  FLEET_TAILSCALE_ALLOW=you@example.com ./provision-vps.sh [--deps-only]
set -euo pipefail

ULTIMATE_CLONE="${ULTIMATE_CLONE:-$HOME/ultimate}"
KIT="${KIT:-$HOME/fleet-kit}"
DEPS_ONLY=0
[[ "${1:-}" == "--deps-only" ]] && DEPS_ONLY=1

step() { printf '\n=== %s ===\n' "$*"; }
sudo_step() { printf '\n=== [sudo] %s ===\n' "$*"; }

if [[ "$(id -u)" -eq 0 ]]; then echo "Run as a normal user with sudo, not as root."; exit 1; fi
if ! command -v apt-get >/dev/null; then echo "This script assumes Ubuntu/Debian (apt). For other distros, install the deps by hand and skip to --deps-only steps."; exit 1; fi

step "Base packages"
sudo_step "apt update + install curl ca-certificates git gnupg"
sudo apt-get update -qq
sudo apt-get install -y -qq curl ca-certificates git gnupg

GIT_OK=0
if command -v git >/dev/null; then
  GIT_V="$(git --version | awk '{print $3}')"
  if [[ "$(printf '%s\n' "2.54" "$GIT_V" | sort -V | head -1)" == "2.54" ]]; then
    GIT_OK=1
    echo "git $GIT_V"
  fi
fi
if [[ "$GIT_OK" -ne 1 ]]; then
  sudo_step "git is missing or older than 2.54 — adding the git-core PPA"
  sudo add-apt-repository -y ppa:git-core/ppa
  sudo apt-get update -qq
  sudo apt-get install -y -qq git
  echo "git $(git --version | awk '{print $3}')"
fi

step "Node 26 (NodeSource)"
if command -v node >/dev/null && [[ "$(node -p 'process.versions.node.split(".")[0]')" == "26" ]]; then
  echo "node $(node -v) already present"
else
  sudo_step "NodeSource setup_26.x"
  curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v

step "pnpm"
if ! command -v pnpm >/dev/null; then sudo_step "npm install -g pnpm"; sudo npm install -g pnpm; fi
pnpm -v

step "Google Chrome (Chromium for the browser/screenshot tools)"
if ! command -v google-chrome >/dev/null && ! command -v google-chrome-stable >/dev/null; then
  sudo_step "install google-chrome-stable .deb"
  wget -qO /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get install -y -qq /tmp/chrome.deb && rm -f /tmp/chrome.deb
else
  echo "chrome already present"
fi

step "Tailscale"
if ! command -v tailscale >/dev/null; then
  sudo_step "tailscale install script"
  curl -fsSL https://tailscale.com/install.sh | sh
else
  echo "tailscale already present"
fi
if ! sudo tailscale status >/dev/null 2>&1; then
  echo
  echo ">> NOW RUN BY HAND (needs your browser):"
  echo ">>   sudo tailscale up"
  echo ">> Then: sudo tailscale set --operator=$USER"
  echo ">> And enable HTTPS certificates: Tailscale admin console -> DNS -> HTTPS Certificates -> Enable."
else
  echo "tailscale is up: $(tailscale ip -4 | head -1)"
  sudo tailscale set --operator="$USER" || true
fi

if [[ "$DEPS_ONLY" -eq 1 ]]; then echo; echo "deps-only: stopping here."; exit 0; fi

step "Ultimate clone -> $ULTIMATE_CLONE"
if [[ ! -d "$ULTIMATE_CLONE" ]]; then
  git clone https://github.com/HazAT/ultimate "$ULTIMATE_CLONE"
fi
cd "$ULTIMATE_CLONE"
echo "pnpm install (first run builds nothing heavy; needs network)"
pnpm install
pnpm add -g "$PWD"
command -v ultimate >/dev/null || echo ">> WARNING: 'ultimate' not on PATH — add pnpm's global bin: pnpm setup"

step "Systemd user unit (ultimate@.service)"
NODE_PATH="$(dirname "$(command -v node)")"
UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"
if [[ -d "$KIT/linux" ]]; then
  sed -e "s|__ULTIMATE_CLONE__|$ULTIMATE_CLONE|g" \
      -e "s|__ULTIMATE_NODE__|$NODE_PATH/node|g" \
      -e "s|__ULTIMATE_PATH__|$NODE_PATH:/usr/local/bin:/usr/bin:/bin|g" \
      "$KIT/linux/ultimate@.service" > "$UNIT_DIR/ultimate@.service"
else
  echo ">> kit not found at $KIT — copy linux/ultimate@.service yourself and fill the placeholders"
fi
systemctl --user daemon-reload

step "User settings (~/.ultimate/settings.json)"
mkdir -p "$HOME/.ultimate"
SETTINGS="$HOME/.ultimate/settings.json"
if [[ -f "$SETTINGS" ]]; then
  echo ">> $SETTINGS exists — merge wiring/tailscale.user-settings.json into it by hand"
else
  ALLOW="${FLEET_TAILSCALE_ALLOW:-REPLACE-me-you@example.com}"
  cat > "$SETTINGS" <<JSON
{
  "extensions": { "enable": ["tailscale"] },
  "tailscale": { "allow": ["$ALLOW"] }
}
JSON
  echo "wrote $SETTINGS (allowlist: $ALLOW)"
fi

step "Done — next steps printed by design"
cat <<NEXT
1. Run by hand:        sudo tailscale up          (auth URL in your browser)
2. Then:               sudo tailscale set --operator=$USER
3. Admin console:      DNS -> HTTPS Certificates -> Enable
4. Enroll each project: ~/fleet-kit/linux/enroll.sh <name>   (reads wiring/fleet.json)
5. Allow linger so units survive without an SSH session:
                        sudo loginctl enable-linger $USER
NEXT
