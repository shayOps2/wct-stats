variable "tenancy_ocid" {}
variable "compartment_ocid" {}
variable "private_key_path" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "shape" {
  default = "VM.Standard.A1.Flex"
}
variable  "talos_image_ocid" {
  description = "OCID of the Talos image"
  type        = string
}