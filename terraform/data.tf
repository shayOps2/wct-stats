data "oci_core_images" "oracle_linux_9" {
  compartment_id            = var.compartment_ocid
  operating_system          = "Oracle Linux"
  operating_system_version  = "9"
  shape                     = "VM.Standard.E2.1.Micro"  
  sort_by                   = "TIMECREATED"
  sort_order                = "DESC"
}
