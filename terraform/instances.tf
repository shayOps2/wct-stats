resource "oci_core_instance" "talos_controlplane" {
  depends_on = [ null_resource.generate_talos_config ]
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = var.shape

  # A1.Flex requires shape_config to set OCPUs and memory.
  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.talos_subnet.id
    assign_public_ip = true
    nsg_ids          = [ oci_core_network_security_group.talos_security_group.id ]
  }

  metadata = {
    user_data = base64encode(file("controlplane.yaml"))
  }

  source_details {
    source_type = "image"
    source_id   = var.talos_image_ocid
  }
  freeform_tags = {
    talos = "true"
  }
  display_name = "talos-controlplane"
}



resource "oci_core_instance" "talos_worker" {

  depends_on = [ null_resource.generate_talos_config ]
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = var.shape

  # A1.Flex requires shape_config to set OCPUs and memory.
  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  create_vnic_details {
    subnet_id         = oci_core_subnet.talos_subnet.id
    assign_public_ip  = true
    nsg_ids = [ oci_core_network_security_group.talos_security_group.id ]
  }

  metadata = {
    user_data = base64encode(file("worker.yaml"))
  }

  source_details {
    source_type = "image"
    source_id   = var.talos_image_ocid
  }
  freeform_tags = {
    talos = "true"
  }
  display_name = "talos-worker"
}



resource "oci_core_instance" "talos_worker2" {

  depends_on = [ null_resource.generate_talos_config ]
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = var.shape

  # A1.Flex requires shape_config to set OCPUs and memory.
  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  create_vnic_details {
    subnet_id         = oci_core_subnet.talos_subnet.id
    assign_public_ip  = true
    nsg_ids = [ oci_core_network_security_group.talos_security_group.id ]
  }

  metadata = {
    user_data = base64encode(file("worker.yaml"))
  }

  source_details {
    source_type = "image"
    source_id   = var.talos_image_ocid
  }
  freeform_tags = {
    talos = "true"
  }
  display_name = "talos-worker2"
}
