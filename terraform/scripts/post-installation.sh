# script to install and configure Vault for a consumer application
# run script from terraform directory
#!/bin/bash
set -e


# load env variables
if [[ -f ".env" ]]; then
  echo "Loading existing .env file..."
  source .env
fi
LB_IP=$(terraform output -raw load_balancer_ip)
NODE_IP=$(terraform output -raw controlplane_private_ip)

# if talos cluster is not set up, set it up
talosctl --talosconfig talosconfig config endpoint $LB_IP
talosctl --talosconfig talosconfig config node $NODE_IP
talosctl --talosconfig talosconfig bootstrap
talosctl --talosconfig talosconfig kubeconfig .


chmod 600 kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig

echo "waiting for talos cluster to be ready..."
until kubectl get nodes &> /dev/null; do
  echo "Waiting for kubectl to connect to the cluster..."
  sleep 5
done
echo "Connected to talos cluster."

echo "Skipping OCI CSI driver install (Longhorn is used instead)."

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

cd ../argocd || exit 1
echo "Setting up Argo CD..."
./install-argocd.sh
echo "Argo CD setup complete."