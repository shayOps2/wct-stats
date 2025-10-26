# script to install and configure Vault for a consumer application
# run script from terraform directory
#!/bin/bash
set -e


# load env variables
if [[ -f ".env" ]]; then
  echo "Loading existing .env file..."
  source .env
fi

echo "connecting to kubernetes cluster..."
SERVER_IP=$(terraform output -raw server_public_ip)
scp -i $PRIVATE_KEY_PATH opc@"$SERVER_IP":/etc/rancher/k3s/k3s.yaml ./kubeconfig
sed -i "s/127.0.0.1:6443/${SERVER_IP}:6443/" kubeconfig
chmod 600 kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig

kubectl get nodes 
echo "Connected to K3s cluster."

echo "Setting up Tailscale..."
if helm list -A | grep -q tailscale-operator; then
  echo "Tailscale operator already installed."
else
  # only add repo if it doesn't already exist to avoid the "repository name already exists" error
  if helm repo list | awk 'NR>1{print $1}' | grep -qx tailscale; then
    echo "Tailscale helm repo already present."
  else
    helm repo add tailscale https://tailscale.github.io/helm-charts
  fi

  helm repo update

  echo "Create an oauth client in Tailscale admin console and set the following environment variables:"
  echo "https://tailscale.com/kb/1236/kubernetes-operator"

  helm upgrade \
    --install \
    tailscale-operator \
    tailscale/tailscale-operator \
    --namespace=tailscale \
    --create-namespace \
    --set-string oauth.clientId="$TAILSCALE_OAUTH_CLIENT_ID" \
    --set-string oauth.clientSecret="$TAILSCALE_OAUTH_CLIENT_SECRET" \
    --wait
fi

echo "installing vault secrets..."
cd ../vault || exit 1
./oci-api-secret.sh

echo "Vault setup complete."

cd ../argo-cd || exit 1
echo "Setting up Argo CD..."
./install-argocd.sh
echo "Argo CD setup complete."