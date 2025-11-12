resource "oci_core_virtual_network" "talos_vcn" {
  cidr_block     = "10.0.0.0/16"
  compartment_id = var.compartment_ocid
  display_name   = "talos-vcn"
}

resource "oci_core_internet_gateway" "talos_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.talos_vcn.id
  display_name   = "talos-internet-gateway"
}

resource "oci_core_route_table" "talos_route_table" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.talos_vcn.id
  display_name   = "talos-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.talos_igw.id
  }
}

resource "oci_core_subnet" "talos_subnet" {
  cidr_block                  = "10.0.1.0/24"
  compartment_id              = var.compartment_ocid
  vcn_id                      = oci_core_virtual_network.talos_vcn.id
  display_name                = "talos-subnet"
  route_table_id              = oci_core_route_table.talos_route_table.id
  prohibit_public_ip_on_vnic  = false
}
