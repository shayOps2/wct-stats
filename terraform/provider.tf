terraform {
  required_providers {
    oci = {
      source  = "hashicorp/oci"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}


provider "oci" {
  # Configuration for the OCI provider
  region = "il-jerusalem-1"
  private_key_path = var.private_key_path
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
}