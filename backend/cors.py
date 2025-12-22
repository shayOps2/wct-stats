from fastapi.middleware.cors import CORSMiddleware

origins = [
    "https://wct.cheetoh-gila.ts.net", # Production URL
    "http://frontend.localhost"
]

def add_cors_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # Frontend URL from docker-compose
        allow_credentials=True,
        allow_methods=["*"],  # Allow all HTTP methods
        allow_headers=["*"],  # Allow all headers
    )