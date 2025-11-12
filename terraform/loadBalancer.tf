resource "oci_network_load_balancer_network_load_balancer" "controlplane_lb" {
  compartment_id = var.compartment_ocid
  display_name   = "talos-controlplane-lb"
  subnet_id      = oci_core_subnet.talos_subnet.id
  network_security_group_ids = [oci_core_network_security_group.talos_security_group.id]
  is_private =  false
}

resource "oci_network_load_balancer_backend_set" "talos" {
  name                     = "talos"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  policy                   = "TWO_TUPLE"

  health_checker {
    port     = 50000
    protocol = "TCP"
  }
}

resource "oci_network_load_balancer_backend_set" "controlplane" {
  name                     = "controlplane"
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  policy                   = "TWO_TUPLE"

  health_checker {
    port        = 6443
    protocol    = "HTTPS"
    return_code = 401
    url_path    = "/readyz"
  }
}


# attach backends and listeners after instances are created
resource "oci_network_load_balancer_backend" "talos_backend" {
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  backend_set_name         = oci_network_load_balancer_backend_set.talos.name
  target_id                = oci_core_instance.talos_controlplane.id
  port                     = 50000
  weight                   = 1

  # ensure instance and backend set exist first
  depends_on = [
    oci_core_instance.talos_controlplane,
    oci_network_load_balancer_backend_set.talos
  ]
}

#add listeners
resource "oci_network_load_balancer_listener" "talos_listener" {
  name                     = "talos-listener"
  default_backend_set_name = oci_network_load_balancer_backend_set.talos.name
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  port                     = 50000
  protocol                 = "TCP"
  depends_on = [ oci_network_load_balancer_backend.talos_backend ]
}

resource "oci_network_load_balancer_backend" "controlplane_backend" {
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  backend_set_name         = oci_network_load_balancer_backend_set.controlplane.name
  target_id                = oci_core_instance.talos_controlplane.id
  port                     = 6443
  weight                   = 1

  depends_on = [
    oci_core_instance.talos_controlplane,
    oci_network_load_balancer_backend_set.controlplane
  ]
}

resource "oci_network_load_balancer_listener" "controlplane_listener" {
  name                     = "controlplane-listener"
  default_backend_set_name = oci_network_load_balancer_backend_set.controlplane.name
  network_load_balancer_id = oci_network_load_balancer_network_load_balancer.controlplane_lb.id
  port                     = 6443
  protocol                 = "TCP_AND_UDP"
  depends_on = [ oci_network_load_balancer_backend.controlplane_backend ]
}