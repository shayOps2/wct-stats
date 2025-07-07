locals {
  ports = ["22", "80", "443", "6443"]
}

resource "oci_core_network_security_group" "k3s_security_group" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.k3s_vcn.id
  display_name   = "k3s-security-group"
}

resource "oci_core_network_security_group_security_rule" "ingress_rules" {
    for_each = toset(local.ports)
    network_security_group_id = oci_core_network_security_group.k3s_security_group.id
    direction                 = "INGRESS"
    protocol                  = "6" # TCP
    source                    = "0.0.0.0/0"

    tcp_options {
        destination_port_range { 
            min = each.value
            max = each.value
        }
    }
}

resource "oci_core_network_security_group_security_rule" "egress_all" {
  network_security_group_id = oci_core_network_security_group.k3s_security_group.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}