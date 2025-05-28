#!/bin/bash

# Test the /players/ endpoint for rate limiting
URL="http://localhost:8000/players/"
TOTAL_REQUESTS=150

echo "Sending $TOTAL_REQUESTS requests to $URL..."

for i in $(seq 1 $TOTAL_REQUESTS); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  echo "Request $i: HTTP $STATUS"
done