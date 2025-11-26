# Terraform — wct-stats infrastructure  

This folder contains Terraform configuration to provision the infrastructure required to run the **wct-stats** application.  
This is the prodcution infrastructure for the application.

## What will be created  

All the resources defined in this folder are created on OCI cloud provider, and are within the "always free" tier limits.
Upon `terraform apply`, the configuration will:  

- Provision the necessary cloud resources (compute, networking, etc.) that power the wct-stats backend and related services.  
- Set up the required networking, security, and environment setup (e.g. VPCs / subnets / security groups / IAM / credentials) so that the application can run securely and reliably.  
- Output key information needed for post installation scripts to finalize the setup (e.g. load balancer IPs, database connection strings). 

## Prerequisites  

Before you run Terraform, make sure you have:  

1. **Terraform installed** 
2. **Credentials / secrets** for OCI cloud provider, exported or configured so Terraform provider blocks can authenticate.  
3. A `terraform.tfvars` (or `*.auto.tfvars`) file (or environment variables) that defines the required variables. 

## Note on talos image
The talos image is a custom image that is built and uploaded to OCI in a separate process. This image is then referenced in the terraform configuration to create the compute instances for the talos cluster.
follow the instrutions on [talos oci](https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/cloud-platforms/oracle#upload-image) to create and upload the talos image to your OCI account.

### Small bug/quirk
when running terraform apply, the instances configuration expect the files `controlplane.yaml` and `worker.yaml` to be present in the same folder as the terraform configuration.
These files will be generated in 'local-exec' provisioner during the first run of `terraform apply`, so the first run will fail.
To fix this, create empty files `controlplane.yaml` and `worker.yaml` in the terraform folder before running `terraform apply` for the first time.
Run `terraform apply` again after the first failure, and the files will be present.