output "controlplane_private_ip" {
  value = oci_core_instance.talos_controlplane.private_ip
}
output "load_balancer_ip" {
  value = oci_network_load_balancer_network_load_balancer.controlplane_lb.ip_addresses[0].ip_address
}
output "vcn_id" {
  value = oci_core_virtual_network.talos_vcn.id
}
output "subnet_id" {
  value = oci_core_subnet.talos_subnet.id
}