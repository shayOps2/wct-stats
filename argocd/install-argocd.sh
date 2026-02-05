#!/bin/bash

kubectl create namespace argocd
kubectl apply -k . -n argocd
kubectl apply -f argocd-ts-ingress.yaml -n argocd
kubectl apply -f longhorn-application.yaml -n argocd
kubectl apply -f application.yaml -n argocd