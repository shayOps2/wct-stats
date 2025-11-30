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
    {{- /* ReplicaSet mode: Build the full RS host */ -}}
    {{- $hosts := list -}}
    {{- range $i := until $replicas -}}
      {{- $hosts = append $hosts (printf "%s-%d.%s:%d" $mongo_name $i $mongo_name $port) -}}
    {{- end -}}
    {{- $rshost := join "," $hosts -}}
    {{- /* Replace placeholder with correct replica set host */ -}}
    {{- $finalValue = printf "mongodb://%s/?replicaSet=rs0" $rshost -}}
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

########## BUILD HOST LIST ##########
{{- $hosts := list -}}
{{- range $i := until $replicas -}}
  {{- $hosts = append $hosts (printf "%s-%d.%s:%d" $mongo_name $i $mongo_name $port) -}}
{{- end -}}

#!/bin/sh
set -e

HOSTS="{{ join " " $hosts }}"
PRIMARY=$(echo "$HOSTS" | awk '{print $1}')

echo "ReplicaSet hosts: $HOSTS"
echo "Primary candidate: $PRIMARY"


########## WAIT FOR ALL HOSTS ##########
echo "Waiting for MongoDB readiness…"
for host in $HOSTS; do
  echo "➡️  Waiting for $host ..."
  i=0
  while [ $i -lt 60 ]; do
    if mongosh --quiet --host "$host" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "✔️  $host ready."
      break
    fi
    i=$((i+1))
    sleep 2
  done
done


########## CHECK IF REPLICA SET EXISTS ##########
RS_EXISTS=$(mongosh --quiet --host "$PRIMARY" --eval \
  "db.getSiblingDB('local').system.replset.findOne() ? 1 : 0" 2>/dev/null)

if [ "$RS_EXISTS" = "1" ]; then
  echo "✔️ Replica set already initialized. Nothing to do."
  exit 0
fi


########## INITIALIZE REPLICA SET ##########
echo "Replica set not found — initializing new RS..."

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

mongosh --quiet --host "$PRIMARY" --eval "
  rs.initiate({ _id: 'rs0', members: [ $MEMBERS ] })
"

echo "✔️ Replica set initialized."
{{- end }}



{{/* restore script */}}
{{- define "mongo.restoreScript" -}}
#!/bin/bash
set -eux

: "${MONGODB_URL:?MONGODB_URL is required}"
: "${UPLOAD_PAR_URL:?UPLOAD_PAR_URL is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"

TMPDIR=${TMPDIR:-/tmp/restore}
mkdir -p "$TMPDIR"
ARCHIVE="$TMPDIR/dump.tgz"
ENV_PATH="${ENV:-development}"
URL="${UPLOAD_PAR_URL}${ENV_PATH}/mongodump-wct.gz"

# Parse hosts from MONGODB_URL
# Remove mongodb:// prefix
CLEAN_URL="${MONGODB_URL#mongodb://}"
# Remove parameters (everything after ?)
CLEAN_URL="${CLEAN_URL%%\?*}"
# Split by comma
IFS=',' read -r -a HOSTS <<< "$CLEAN_URL"

echo "Parsed hosts: ${HOSTS[*]}"

PRIMARY_HOST=""
echo "Finding primary node..."
# Try to find primary for up to 5 minutes
for i in $(seq 1 30); do
  for host in "${HOSTS[@]}"; do
    echo "Checking $host..."
    # Check if node is primary
    if IS_PRIMARY=$(mongosh --host "$host" --quiet --eval "db.isMaster().ismaster" 2>/dev/null); then
      if [ "$IS_PRIMARY" = "true" ]; then
        PRIMARY_HOST="$host"
        echo "Found primary: $PRIMARY_HOST"
        break 2
      fi
    fi
  done
  echo "No primary found yet. Waiting..."
  sleep 10
done

if [ -z "$PRIMARY_HOST" ]; then
  echo "Failed to find primary node after retries."
  exit 1
fi

# Check if database exists and is populated using the primary
if ! COUNT=$(mongosh --host "$PRIMARY_HOST" --quiet --eval "db.getSiblingDB('${DATABASE_NAME}').getCollectionNames().length" | tr -d '\r'); then
  echo "Failed to get collection count"
  exit 1
fi
COUNT=${COUNT:-0}
echo "Detected collection count in ${DATABASE_NAME}: ${COUNT}"

if [ "$COUNT" -gt 0 ]; then
  echo "Database ${DATABASE_NAME} exists and is populated. Skipping restore."
  exit 0
fi

echo "Database ${DATABASE_NAME} does not exist or is empty. Proceeding with restore."

echo "Downloading ${URL}"
curl -fSL -o "$ARCHIVE" "$URL"

echo "Creating database ${DATABASE_NAME}..."
mongosh --host "$PRIMARY_HOST" --quiet --eval "use ${DATABASE_NAME}; db.createCollection('init_marker')"

echo "Attempting mongorestore as --archive"
# Use the primary host directly
if mongorestore --host "$PRIMARY_HOST" --archive="$ARCHIVE" --gzip --nsInclude="${DATABASE_NAME}.*"; then
  echo "Restore via --archive succeeded"
  exit 0
else
  echo "--archive restore failed, will try tar extraction + mongorestore --dir"
fi

EXTRACT_DIR="$TMPDIR/extracted"
mkdir -p "$EXTRACT_DIR"

if tar -tzf "$ARCHIVE" > /dev/null 2>&1; then
  tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
  echo "Archive extracted to $EXTRACT_DIR; running mongorestore --dir"
  if mongorestore --host "$PRIMARY_HOST" --dir "$EXTRACT_DIR" --nsInclude="${DATABASE_NAME}.*"; then
    echo "Restore via --dir succeeded"
    exit 0
  else
    echo "mongorestore --dir failed"
    exit 1
  fi
else
  echo "Downloaded file is not a tar.gz; cannot extract"
  exit 1
fi
{{- end -}}
