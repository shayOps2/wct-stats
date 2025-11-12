resource "null_resource" "generate_talos_config" {
  depends_on = [ 
    oci_network_load_balancer_network_load_balancer.controlplane_lb, 
    oci_core_internet_gateway.talos_igw, 
    oci_core_network_security_group.talos_security_group
     ]
  provisioner "local-exec" {
    command = <<EOT
talosctl gen config mycluster \
  https://${oci_network_load_balancer_network_load_balancer.controlplane_lb.ip_addresses[0].ip_address}:6443 \
  --additional-sans ${oci_network_load_balancer_network_load_balancer.controlplane_lb.ip_addresses[0].ip_address} --force

sed -i '/^\s*#/d;/^\s*$/d' controlplane.yaml
sed -i '/^\s*#/d;/^\s*$/d' worker.yaml

yq eval -i '.machine.time.servers = ["169.254.169.254"]' controlplane.yaml
yq eval -i '.machine.time.servers = ["169.254.169.254"]' worker.yaml
EOT
  }
}