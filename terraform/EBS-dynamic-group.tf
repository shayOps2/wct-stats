resource "oci_identity_dynamic_group" "talos_nodes" {
  depends_on = [oci_core_instance.talos_controlplane, oci_core_instance.talos_worker]
  compartment_id = var.tenancy_ocid
  name           = "talos-nodes"
  description    = "All Talos cluster nodes"

  matching_rule = "instance.compartment.id = '${var.compartment_ocid}'"
}

resource "oci_identity_policy" "talos_csi_policy" {
  depends_on = [oci_core_instance.talos_controlplane, oci_core_instance.talos_worker]
  name           = "talos-csi-policy"
  description    = "Permissions for Talos nodes to manage volumes"
  compartment_id = var.tenancy_ocid

  statements = [
    "Allow dynamic-group talos-nodes to manage volume-family in tenancy",
    "Allow dynamic-group talos-nodes to manage instance-family in tenancy",
    "Allow dynamic-group talos-nodes to manage virtual-network-family in tenancy"
  ]
}
