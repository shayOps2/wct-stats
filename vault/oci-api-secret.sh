#!/usr/bin/env bash
set -euo pipefail
# Namespace where External Secrets Operator runs
NAMESPACE="default"
SECRET_NAME="oci-credentials"

echo "This script will create a Kubernetes Secret ($SECRET_NAME) in namespace '$NAMESPACE'"
echo "It will NOT store or expose any credentials in Git."

if [[ -f ".env" ]]; then
  echo "Loading existing .env file..."
  source .env
fi
# Prompt the user for each value
if [[ -z "$FINGERPRINT" ]]; then
  read -rp "Enter Key Fingerprint: " FINGERPRINT
fi
if [[ -z "$PRIVATE_KEY_PATH" ]]; then
  read -rp "Enter path to private key file (PEM format): " PRIVATE_KEY_PATH
fi

if [[ ! -f "$PRIVATE_KEY_PATH" ]]; then
  echo "Error: File not found at $PRIVATE_KEY_PATH"
  exit 1
fi

echo "Creating namespace if not exists..."
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || \
  kubectl create namespace "$NAMESPACE"

echo "Creating secret..."
if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Secret '$SECRET_NAME' already exists in namespace '$NAMESPACE'."
else
  kubectl create secret generic "$SECRET_NAME" \
    --namespace "$NAMESPACE" \
    --from-literal=fingerprint="$FINGERPRINT" \
    --from-file=privateKey="$PRIVATE_KEY_PATH"
fi

if [[ $? -ne 0 ]]; then
  echo "Error: Failed to create secret."
  exit 1
fi
echo "✅ Secret '$SECRET_NAME' created in namespace '$NAMESPACE'."

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace \
  --set installCRDs=true

echo "✅ External Secrets Operator installed."
echo "Waiting for External Secrets Operator to be ready..."
kubectl wait --for=condition=available --timeout=200s deployment/external-secrets -n external-secrets
sleep 20
# if there is validatingwebhookconfiguration, delete it to avoid issues
if kubectl get validatingwebhookconfigurations | grep -q secretstore-validate ; then
  kubectl delete validatingwebhookconfiguration secretstore-validate 
fi
if kubectl get validatingwebhookconfigurations | grep -q externalsecret-validate ; then
  kubectl delete validatingwebhookconfiguration externalsecret-validate
fi
kubectl apply -f secret-store-oci.yaml -n "$NAMESPACE"
echo "✅ SecretStore applied."

kubectl apply -f external-secret-oci.yaml -n "$NAMESPACE"
echo "✅ ExternalSecret applied."

echo "Setup complete. External Secrets Operator is configured to use OCI API credentials."