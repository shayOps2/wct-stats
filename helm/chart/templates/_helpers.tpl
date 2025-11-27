{{/*
Expand the name of the chart.
*/}}
{{- define "chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* helper function to expand env for mongodb url with more than 1 replicas */}}
{{- define "envValue" -}}
{{- $env := .env -}}
{{- $context := .context -}}
{{- $replicas := $context.Values.mongo.replicas | int -}}
{{- $chart_fullname := include "chart.fullname" $context -}} 
{{- $mongo_name := printf "%s-mongo" $chart_fullname -}}
{{- $finalValue := $env.value -}}
{{- $port := (index $context.Values.mongo.ports 0).port | int -}}

{{- if contains "__MONGO_HOST__" $env.value }}
  {{- if gt $replicas 1 -}}
    {{- /* ReplicaSet mode: Build the full RS URI */ -}}
    {{- $hosts := list -}}
    {{- range $i := until $replicas -}}
      {{- $hosts = append $hosts (printf "%s-%d.%s:%d" $mongo_name $i $mongo_name $port) -}}
    {{- end -}}
    {{- $rsUri := join "," $hosts -}}
    {{- /* Replace placeholder with correct replica set URI */ -}}
    {{- $finalValue = printf "mongodb://%s/?replicaSet=rs0" $rsUri -}}
  {{- else -}}
    {{- /* Single Host mode: just use service name and port */ -}}
    {{- $finalValue = printf "mongodb://%s:%d" $mongo_name $port -}}
  {{- end -}}
{{- end -}}

{{- $finalValue -}}
{{- end -}}

{{/* initialize mongodb replicaset script */}}
{{- define "mongo.initScript" -}}
{{- $replicas := .Values.mongo.replicas | int -}}
{{- $port := (index .Values.mongo.ports 0).port | int -}}
{{- $chart_fullname := include "chart.fullname" . -}}
{{- $mongo_name := printf "%s-mongo" $chart_fullname -}}

{{- /* Build host list */ -}}
{{- $hosts := list -}}
{{- range $i := until $replicas -}}
  {{- $hosts = append $hosts (printf "%s-%d.%s:%d" $mongo_name $i $mongo_name $port) -}}
{{- end -}}

#!/bin/bash
set -e

HOSTS="$(printf "%s" "{{ join " " $hosts }}")"

PRIMARY=$(echo "$HOSTS" | awk '{print $1}')

echo "ReplicaSet hosts: $HOSTS"
echo "Primary will be: $PRIMARY"

echo "Checking MongoDB readiness for each replica..."
for host in $HOSTS; do
  echo "Waiting for MongoDB at $host ..."
  for attempt in $(seq 1 60); do
    if mongosh --host "$host" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "$host is ready."
      break
    fi
    echo "Retrying $host ($attempt/60)..."
    sleep 2
  done
done


echo "Checking if replica set already initialized..."
if ! mongosh --host "$PRIMARY" --eval "rs.status()" | grep -q "_id"; then
  echo "Replica set not initialized. Initializing..."

  MEMBERS=""
  IDX=0
  for host in $HOSTS; do
    if [ -z "$MEMBERS" ]; then
      MEMBERS="{ _id: $IDX, host: '$host' }"
    else
      MEMBERS="$MEMBERS, { _id: $IDX, host: '$host' }"
    fi
    IDX=$((IDX+1))
  done

  echo "Replica set members:"
  echo "$MEMBERS"

  mongosh --host "$PRIMARY" \
    --eval "rs.initiate({ _id: 'rs0', members: [ $MEMBERS ] })"

  echo "Replica set initialized."
else
  echo "Replica set already initialized."
fi

{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "chart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "chart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
