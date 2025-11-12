output "controlplane_private_ip" {
  value = oci_core_instance.talos_controlplane.private_ip
}
output "load_balancer_ip" {
  value = oci_network_load_balancer_network_load_balancer.controlplane_lb.ip_addresses[0].ip_address
}