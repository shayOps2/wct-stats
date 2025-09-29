#!/usr/bin/env bash

# Namespace where External Secrets Operator runs
NAMESPACE="default"
SECRET_NAME="oci-credentials"

echo "This script will create a Kubernetes Secret ($SECRET_NAME) in namespace '$NAMESPACE'"
echo "It will NOT store or expose any credentials in Git."

# Prompt the user for each value
read -rp "Enter Key Fingerprint: " FINGERPRINT
read -rp "Enter path to private key file (PEM format): " PRIVATE_KEY_PATH

if [[ ! -f "$PRIVATE_KEY_PATH" ]]; then
  echo "Error: File not found at $PRIVATE_KEY_PATH"
  exit 1
fi

echo "Creating namespace if not exists..."
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || \
  kubectl create namespace "$NAMESPACE"

echo "Creating secret..."
kubectl create secret generic "$SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=fingerprint="$FINGERPRINT" \
  --from-file=privateKey="$PRIVATE_KEY_PATH"

echo "✅ Secret '$SECRET_NAME' created in namespace '$NAMESPACE'."
