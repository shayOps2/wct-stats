resource "random_password" "k3s_token" {
  length  = 32
  special = false
}
