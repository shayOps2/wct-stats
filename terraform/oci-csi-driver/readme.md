### create oci csi driver after cluster is created
# cloud provisioner file should be configured with comparment id, vcn id and subnet id after terraform execution
- cloud-provider-example.yaml file is hidden from git for security reasons, create it and configure it
- following guide at https://oracle.github.io/cluster-api-provider-oci/gs/install-csi.html

Create a secret:

```sh
  kubectl  create secret generic oci-volume-provisioner \
  -n kube-system                                           \
  --from-file=config.yaml=cloud-provider-example.yaml```

tag clutser nodes with instances' <region>-<Availability domain> 
``` kubectl label node <talos-worker-nodes> topology.kubernetes.io/zone=IL-JERUSALEM-1-AD-1 --overwrite ```
``` kubectl label node  <talos-worker-nodes> failure-domain.beta.kubernetes.io/zone=IL-JERUSALEM-1-AD-1 --overwrite ```
``` kubectl label node <talos-worker-nodes> failure-domain.beta.kubernetes.io/region=IL-JERUSALEM-1 --overwrite ```

apply all yaml manifests files in oci-csi-driver folder
test dynamic provisioning with 'test-storage-class.yaml' file