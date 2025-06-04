#!/bin/bash

set -e

REGISTRY_NAME='local-registry'
REGISTRY_PORT='5000'

echo "🔧 Step 1: Start a local Docker registry..."
docker container inspect $REGISTRY_NAME >/dev/null 2>&1 || \
docker run -d --restart=always -p ${REGISTRY_PORT}:5000 --name ${REGISTRY_NAME} registry:3

echo "✅ Local registry running at localhost:${REGISTRY_PORT}"

echo "🔧 Step 2: Configure containerd in k3s to use the local registry..."

# This file is automatically read by containerd in k3s
sudo mkdir -p /etc/rancher/k3s
cat <<EOF | sudo tee /etc/rancher/k3s/registries.yaml > /dev/null
mirrors:
  "localhost:${REGISTRY_PORT}":
    endpoint:
      - "http://localhost:${REGISTRY_PORT}"
EOF

echo "🔄 Step 3: Restart k3s to pick up the registry config..."
sudo systemctl restart k3s

echo "✅ k3s is now configured to use your local Docker registry."

