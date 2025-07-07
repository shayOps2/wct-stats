data "oci_identity_availability_domains" "ads" {
  # The tenancy OCID is required to list availability domains.
  # It is usually the same as the compartment OCID.
  compartment_id = var.tenancy_ocid
}