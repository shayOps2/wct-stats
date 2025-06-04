#!/bin/bash

set -e

# Registry config
REGISTRY_HOST=localhost
REGISTRY_PORT=5000
REGISTRY="${REGISTRY_HOST}:${REGISTRY_PORT}"

# Check if local registry is running
if ! docker ps | grep -q "${REGISTRY_PORT}->5000"; then
  echo "Local Docker registry not running. Starting it..."
  docker run -d --restart=always -p ${REGISTRY_PORT}:5000 --name local-registry registry:2 || true
else
  echo "Local registry already running at ${REGISTRY}"
fi

# Build and push images
build_and_push() {
  local NAME=$1
  local DOCKERFILE=$2
  local CONTEXT=$3
  local IMAGE_NAME="${REGISTRY}/wct-stats-${NAME}:latest"

  echo "📦 Building ${NAME} image..."

  if [ "$NAME" == "frontend" ]; then
    docker build --build-arg REACT_APP_BACKEND_URL=http://backend.example -t "${IMAGE_NAME}" -f "${DOCKERFILE}" "${CONTEXT}"
  else
    docker build -t "${IMAGE_NAME}" -f "${DOCKERFILE}" "${CONTEXT}"
  fi
  echo "🚀 Pushing ${NAME} image to local registry..."
  docker push "${IMAGE_NAME}"
}

if [ "$#" -eq 0 ]; then
  echo "No arguments provided. Building and pushing all images..."
  build_and_push frontend ../frontend/Dockerfile ../frontend
  build_and_push backend ../backend/Dockerfile ../backend
  build_and_push mongo-restore ../Dockerfile.mongo-restore ../
elif [ "$1" == "frontend" ]; then
  build_and_push frontend ../frontend/Dockerfile ../frontend
elif [ "$1" == "backend" ]; then
  build_and_push backend ../backend/Dockerfile ../backend
elif [ "$1" == "mongo" ]; then
  build_and_push mongo-restore ../Dockerfile.mongo-restore ../
else
  echo "❌ Invalid argument. Use 'frontend', 'backend', 'mongo', or no argument to build all images."
  exit 1
fi
