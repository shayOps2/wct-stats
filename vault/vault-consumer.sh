# script to install and configure Vault for a consumer application
#!/bin/bash
set -e

SKIP_TAILSCALE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  key="$1"
    case $key in
        --skip-ts)
        SKIP_TAILSCALE=true
        shift # past argument
        ;;
        *)
        echo "Unknown option: $key"
        exit 1
        ;;
    esac
done

if [ "$SKIP_TAILSCALE" != "true" ]; then
  echo "Setting up Tailscale..."

  if helm list -A | grep -q tailscale-operator; then
    echo "Tailscale operator already installed."
  else
    helm repo add tailscale https://tailscale.github.io/helm-charts
    helm repo update

    echo "Create an oauth client in Tailscale admin console and set the following environment variables:"
    echo "https://tailscale.com/kb/1236/kubernetes-operator"

    if [[ -z "$TAILSCALE_OAUTH_CLIENT_ID" ]]; then
      read -sp "Enter Tailscale OAuth Client ID: " TAILSCALE_OAUTH_CLIENT_ID
      echo
    fi
    if [[ -z "$TAILSCALE_OAUTH_CLIENT_SECRET" ]]; then
      read -sp "Enter Tailscale OAuth Client Secret: " TAILSCALE_OAUTH_CLIENT_SECRET
      echo
    fi

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

  kubectl apply -f tailnet-egress.yaml
  kubectl apply -f dnsconfig.yaml

  echo "Waiting for DNS configuration to be ready..."
  while true; do
    NAMESERVER_IP=$(kubectl get dnsconfig ts-dns -o jsonpath='{.status.nameserver.ip}')
    if [ -n "$NAMESERVER_IP" ]; then
      echo "DNS configuration is ready with nameserver IP: $NAMESERVER_IP"
      break
    else
      echo "Waiting for DNS configuration..."
      sleep 5
    fi
  done

  CURRENT_COREFILE=$(kubectl -n kube-system get configmap coredns -o jsonpath='{.data.Corefile}')
  echo "$CURRENT_COREFILE

ts.net {
  errors
  cache 30
  forward . $NAMESERVER_IP
}" > /tmp/Corefile-patched

  awk '{print "    " $0}' /tmp/Corefile-patched > /tmp/Corefile-patched
  kubectl -n kube-system patch configmap coredns --type merge --patch "$(cat <<EOF
data:
  Corefile: |
$(cat /tmp/Corefile-patched)
EOF
)"

  kubectl -n kube-system rollout restart deployment coredns
  # === end of big chunk ===

else
  echo "Skipping Tailscale setup as requested."
fi

## check if vault cli is configured
if ! command -v vault &> /dev/null; then
  echo "Vault CLI is not installed. Please install it to proceed."
  echo "After installing, run 'vault login' to authenticate."
  echo "Rerun the script with flag --skip-ts to skip Tailscale setup."
  exit 1
fi
# check if vault cli is authenticated
if ! vault status &> /dev/null; then
  echo "Vault CLI is not authenticated. Please authenticate to Vault before proceeding."
  echo "Rerun the script with flag --skip-ts to skip Tailscale setup."
  exit 1
fi

export VAULT_ADDR=https://vault.cheetoh-gila.ts.net

vault auth enable -path=kubernetes-dev kubernetes

# MACHINE_IP=$(tailscale ip -4)

# vault write auth/kubernetes-dev/config \
# 	kubernetes_host=https://$MACHINE_IP:6443 \
# 	kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
# 	token_reviewer_jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token) \
# 	issuer=https://kubernetes.default.svc.cluster.local