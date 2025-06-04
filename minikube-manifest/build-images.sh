# if no minikube is installed, exit
if ! command -v minikube &> /dev/null; then
  echo "Minikube is not installed. Please install Minikube to continue."
  exit 1
fi

# if minikube is not running, start it
if ! minikube status &> /dev/null; then
  echo "Starting Minikube..."
  minikube start
fi


# eval minikube docker-env
eval $(minikube docker-env)
echo "Minikube Docker environment set up."

# check user arguments
if [ "$#" -eq 0 ]; then
  # build all images
  echo "No arguments provided. Building all images."
  docker build --build-arg REACT_APP_BACKEND_URL=http://backend.example.com -t wct-stats-frontend:minikube -f ../frontend/Dockerfile ../frontend
  docker build -t wct-stats-backend:minikube -f ../backend/Dockerfile ../backend
  docker build -t wct-stats-mongo-restore -f ../Dockerfile.mongo-restore ../
elif [ "$1" == "frontend" ]; then
  # build frontend image only
  echo "Building frontend image only."
  docker build --build-arg REACT_APP_BACKEND_URL=http://backend.example.com -t wct-stats-frontend:minikube -f ../frontend/Dockerfile ../frontend
elif [ "$1" == "backend" ]; then
  # build backend image only
  echo "Building backend image only."
  docker build -t wct-stats-backend:minikube -f ../backend/Dockerfile ../backend
elif [ "$1" == "mongo" ]; then
  # build mongo image only
  echo "Building MongoDB image only."
  docker build -t wct-stats-mongo-restore -f ../Dockerfile.mongo-restore ../
else
  echo "Invalid argument. Use 'frontend', 'backend', 'mongo', or no argument to build all images."
  exit 1
fi

