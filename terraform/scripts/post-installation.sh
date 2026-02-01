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
VCN=$(terraform output -raw vcn_id)
SUBNET1=$(terraform output -raw subnet_id)

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

echo "writing oci-csi-driver cloud provider config..."
cat << EOF > oci-csi-driver/provider-config-instance-principals.yaml
useInstancePrincipals: true

compartment: $COMPARTMENT_ID

vcn: $VCN

loadBalancer:
  subnet1: $SUBNET1
  subnet2: $SUBNET2
  securityListManagementMode: All
EOF

kubectl  create secret generic oci-volume-provisioner \
  -n kube-system                                       \
  --from-file=config.yaml=oci-csi-driver/provider-config-instance-principals.yaml


echo "OCI CSI Driver cloud provider config written."
echo "Applying OCI CSI Driver manifests..."
kubectl apply -f oci-csi-driver/storage-class.yaml
kubectl apply -f oci-csi-driver/oci-csi-node-rbac.yaml
kubectl apply -f oci-csi-driver/oci-csi-node-driver.yaml
kubectl apply -f oci-csi-driver/oci-csi-controller-driver.yaml
echo "OCI CSI Driver manifests applied."


echo "labeling nodes for OCI CSI Driver..."
nodes=$(kubectl get nodes -o name | cut -d'/' -f2 | grep talos-worker)
for node in $nodes; do
  kubectl label node $node topology.kubernetes.io/zone=IL-JERUSALEM-1-AD-1 --overwrite
  kubectl label node $node failure-domain.beta.kubernetes.io/zone=IL-JERUSALEM-1-AD-1 --overwrite
  kubectl label node $node failure-domain.beta.kubernetes.io/region=IL-JERUSALEM-1 --overwrite
done
echo "Nodes labeled."

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