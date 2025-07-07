resource "oci_core_instance" "k3s_server" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = var.shape


  create_vnic_details {
    subnet_id         = oci_core_subnet.k3s_subnet.id
    assign_public_ip  = true
    nsg_ids = [ oci_core_network_security_group.k3s_security_group.id ]
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("scripts/k3s-server.sh", {
      token = random_password.k3s_token.result
    })) 
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux_9.images[0].id
  }

  display_name = "k3s-server"
}



resource "oci_core_instance" "k3s_agent" {
  depends_on = [ oci_core_instance.k3s_server ]
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = var.shape

  create_vnic_details {
    subnet_id         = oci_core_subnet.k3s_subnet.id
    assign_public_ip  = true
    nsg_ids = [ oci_core_network_security_group.k3s_security_group.id ]
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("scripts/k3s-agent.sh", {
      master_ip = oci_core_instance.k3s_server.private_ip
      token     = random_password.k3s_token.result
    }))
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux_9.images[0].id
  }

  display_name = "k3s-agent"
}
