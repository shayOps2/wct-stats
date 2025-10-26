#!/bin/bash
set -eux

# token is provided by Terraform templatefile
K3S_TOKEN="${token}"

# Try to discover this instance public IP at runtime (used as TLS SAN).
# Fallback to empty if detection fails.
public_ip="$(curl -s --max-time 5 https://ifconfig.me || true)"
if [ -z "$public_ip" ]; then
  public_ip="$(curl -s --max-time 5 https://ipinfo.io/ip || true)"
fi

TLS_OPT=""
if [ -n "$public_ip" ]; then
  TLS_OPT="--tls-san $public_ip"
  echo "Using public IP for TLS SAN: $public_ip"
else
  echo "No public IP detected; will not add external TLS SAN"
fi

# Install K3s server with optional TLS SAN
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_SKIP_START=true \
  INSTALL_K3S_SKIP_SELINUX_RPM=true \
  INSTALL_K3S_EXEC="--write-kubeconfig-mode 644 $TLS_OPT" \
  K3S_TOKEN="$K3S_TOKEN" \
  sh -

# Open required ports via firewalld if present
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --zone=public --add-port=6443/tcp || true
  firewall-cmd --permanent --zone=public --add-port=80/tcp || true
  firewall-cmd --permanent --zone=public --add-port=443/tcp || true
  firewall-cmd --reload || true
fi

# Fix SELinux label (no-op if SELinux not enabled)
restorecon -v /usr/local/bin/k3s || true

# Start and enable k3s
systemctl daemon-reexec || true
systemctl daemon-reload || true
systemctl start k3s
systemctl enable k3s