# Vault configuration — wct‑stats

This folder contains configuration for secrets management using OCI Vault.

## What this folder is for

- Providing a central, secure place for secrets — instead of committing secrets in configuration files, or hardcoding them in code.  
- Accessing secrets securely from applications running in the cluster.

## pre-requisites
- An OCI Vault created in your tenancy.
- A secret created in the vault, containing the data you want to store securely.

see 'external-sercrets-oci,yaml' for an example of what secrets to create in the vault.