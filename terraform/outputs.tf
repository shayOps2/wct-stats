output "server_public_ip" {
  value = oci_core_instance.k3s_server.public_ip
}

output "agent_public_ips" {
  value = oci_core_instance.k3s_agent.public_ip
}
