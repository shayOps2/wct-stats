from fastapi.testclient import TestClient
from app import app


def test_root():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "World Chase Tag Stats API"}