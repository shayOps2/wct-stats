variable "tenancy_ocid" {}
variable "compartment_ocid" {}
variable "ssh_public_key_path" {}
variable "private_key_path" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "shape" {
  default = "VM.Standard.E2.1.Micro"
}