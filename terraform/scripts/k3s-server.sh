#!/bin/bash
set -eux

# Use a predefined token for reproducibility
K3S_TOKEN="${token}"

# Install K3s server
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_START=true INSTALL_K3S_SKIP_SELINUX_RPM=true INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" K3S_TOKEN="$K3S_TOKEN" sh -


# Fix SELinux label
sudo restorecon -v /usr/local/bin/k3s

# Start K3s manually
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl start k3s
sudo systemctl enable k3s
