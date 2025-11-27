#!/bin/sh
set -eux

# required env vars:
# - MONGODB_URL  (e.g. "<release>-mongo:27017")
# - UPLOAD_PAR_URL     (pre-authenticated GET/PUT URL to download the dump)
: "${MONGODB_URL:?MONGODB_URL is required}"
: "${UPLOAD_PAR_URL:?UPLOAD_PAR_URL is required}"

TMPDIR=${TMPDIR:-/tmp/restore}
mkdir -p "$TMPDIR"
ARCHIVE="$TMPDIR/dump.tgz"
# Use ENV if set, otherwise default to empty (or handle as needed)
ENV_PATH="${ENV:-development}"
URL="${UPLOAD_PAR_URL}${ENV_PATH}/mongodump-wct.gz"

echo "Downloading ${URL}"
curl -fSL -o "$ARCHIVE" "$URL"

# if Mongo already has data, skip restore
COUNT=$(mongo --uri "$MONGODB_URL" --quiet --eval "db.adminCommand('listDatabases').databases.length" | tr -d '\r' || echo 0)
echo "Detected database count: ${COUNT}"
if [ -n "$COUNT" ] && [ "$COUNT" -gt 1 ]; then
  echo "Mongo already has data, skipping restore"
  exit 0
fi

echo "Attempting mongorestore as --archive (mongodump archive)"
if mongorestore --uri "$MONGODB_URL" --archive="$ARCHIVE" --gzip --drop; then
  echo "Restore via --archive succeeded"
  exit 0
else
  echo "--archive restore failed, will try tar extraction + mongorestore --dir"
fi

EXTRACT_DIR="$TMPDIR/extracted"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

# confirm it's a tar.gz and extract
if tar -tzf "$ARCHIVE" > /dev/null 2>&1; then
  tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
  echo "Archive extracted to $EXTRACT_DIR; running mongorestore --dir"
  if mongorestore --uri "$MONGODB_URL" --dir "$EXTRACT_DIR" --drop; then
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