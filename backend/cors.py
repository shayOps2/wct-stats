from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:8080",  # Local development 
    "http://localhost:3000",  # Local development with React
    "http://frontend.example.com", # minikube frontend URL
    "http://frontend.example", # k3s frontend URL
    "https://wct.cheetoh-gila.ts.net", # Production URL
    "http://frontend.localhost:8081" # Local development with skaffold
]

def add_cors_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Frontend URL from docker-compose
        allow_credentials=True,
        allow_methods=["*"],  # Allow all HTTP methods
        allow_headers=["*"],  # Allow all headers
    )