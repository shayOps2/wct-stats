output "server_public_ip" {
  value = oci_core_instance.k3s_server.public_ip
}
