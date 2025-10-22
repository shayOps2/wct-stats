#!/bin/sh
set -eux

# required env vars:
# - MONGO_HOST  (e.g. "<release>-mongo:27017")
# - UPLOAD_PAR_URL     (pre-authenticated GET/PUT URL to download the dump)
: "${MONGO_HOST:?MONGO_HOST is required}"
: "${UPLOAD_PAR_URL:?UPLOAD_PAR_URL is required}"

TMPDIR=${TMPDIR:-/tmp/restore}
mkdir -p "$TMPDIR"
ARCHIVE="$TMPDIR/dump.tgz"
URL=$UPLOAD_PAR_URL"mongodump-wct.gz";

echo "Downloading ${URL} -> ${URL}"
curl -fSL -o "$ARCHIVE" "$URL"

echo "Attempting mongorestore"
if mongorestore --host "$MONGO_HOST" --archive="$ARCHIVE" --gzip --drop; then
  echo "Restore via --archive succeeded"
  exit 0
else
  echo "Restore failed"
  exit 1
fi

COUNT=$(mongo --host "$MONGO_HOST" --quiet --eval "db.adminCommand('listDatabases').databases.length" | tr -d '\r' || echo 0)
echo "Detected database count: ${COUNT}"
if [ -n "$COUNT" ] && [ "$COUNT" -gt 1 ]; then
  echo "Mongo already has data, skipping restore"
  exit 0
fi
