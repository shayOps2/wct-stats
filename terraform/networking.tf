resource "oci_core_virtual_network" "k3s_vcn" {
  cidr_block     = "10.0.0.0/16"
  compartment_id = var.compartment_ocid
  display_name   = "k3s-vcn"
}

resource "oci_core_internet_gateway" "k3s_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.k3s_vcn.id
  display_name   = "k3s-internet-gateway"
}

resource "oci_core_route_table" "k3s_route_table" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.k3s_vcn.id
  display_name   = "k3s-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.k3s_igw.id
  }
}

resource "oci_core_subnet" "k3s_subnet" {
  cidr_block        = "10.0.1.0/24"
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_virtual_network.k3s_vcn.id
  display_name      = "k3s-subnet"
  route_table_id = oci_core_route_table.k3s_route_table.id
  prohibit_public_ip_on_vnic = false
}
