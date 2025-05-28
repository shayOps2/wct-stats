from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:8080",  # Local development 
    "http://localhost:3000",  # Local development with React
]

def add_cors_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Frontend URL from docker-compose
        allow_credentials=True,
        allow_methods=["*"],  # Allow all HTTP methods
        allow_headers=["*"],  # Allow all headers
    )