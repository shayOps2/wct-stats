#!/bin/bash
set -eux

# Connect agent to master using private IP
server_ip="${master_ip}"
K3S_URL="https://${master_ip}:6443"
K3S_TOKEN="${token}"


# Wait for server to be ready (max 5 minutes)
timeout=300
interval=5
elapsed=0

echo "Waiting for K3s server at $server_ip:6443 to become available..."

while ! nc -z "$server_ip" 6443; do
  sleep $interval
  elapsed=$((elapsed + interval))
  if [ $elapsed -ge $timeout ]; then
    echo "Timed out waiting for K3s server after $timeout seconds"
    exit 1
  fi
done

echo "K3s server is up. Joining as agent..."
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_START=true INSTALL_K3S_SKIP_SELINUX_RPM=true K3S_URL="$K3S_URL" K3S_TOKEN="$K3S_TOKEN" sh -

# Fix SELinux context so the binary can be executed
sudo restorecon -v /usr/local/bin/k3s

# Start and enable the agent service
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl start k3s-agent
sudo systemctl enable k3s-agent