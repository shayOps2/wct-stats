
resource "oci_core_network_security_group" "talos_security_group" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.talos_vcn.id
  display_name   = "talos-security-group"
}

resource "oci_core_network_security_group_security_rule" "ingress_rules" {
    network_security_group_id = oci_core_network_security_group.talos_security_group.id
    direction                 = "INGRESS"
    protocol                  = "all" # TCP
    source                    = "0.0.0.0/0"

}

resource "oci_core_network_security_group_security_rule" "egress_all" {
  network_security_group_id = oci_core_network_security_group.talos_security_group.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}