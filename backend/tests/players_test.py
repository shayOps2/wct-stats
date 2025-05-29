import io
import pytest
from models import UserRole

ADMIN = "admin_players"
ADMIN_PASSWORD = "Adminpass123"
USER = "user_players"
USER_PASSWORD = "Userpass123"

@pytest.fixture
def admin_token(client):
    client.post(
        "/login/register",
        json={"username": ADMIN, "password": ADMIN_PASSWORD, "role": UserRole.admin}
    )
    response = client.post(
        "/login/token",
        data={"username": ADMIN, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return response.json()["access_token"]

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def user_token(client):
    client.post(
        "/login/register",
        json={"username": USER, "password": USER_PASSWORD, "role": UserRole.user}
    )
    response = client.post(
        "/login/token",
        data={"username": USER, "password": USER_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return response.json()["access_token"]

@pytest.fixture
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}

def test_create_player_admin(client, admin_headers):
    response = client.post(
        "/players/",
        data={"name": "Test Player"},
        headers=admin_headers
    )
    assert response.status_code == 200
    player = response.json()
    assert player["name"] == "Test Player"
    test_create_player_admin.player_id = player["id"]

def test_create_player_non_admin_forbidden(client, user_headers):
    response = client.post(
        "/players/",
        data={"name": "NonAdmin Player"},
        headers=user_headers
    )
    assert response.status_code == 403
    assert "Admin privileges required" in response.json().get("detail", "")

def test_list_players(client):
    response = client.get("/players/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_player_by_id(client):
    player_id = test_create_player_admin.player_id
    response = client.get(f"/players/{player_id}")
    assert response.status_code == 200
    player = response.json()
    assert player["id"] == player_id

def test_delete_player_non_admin_forbidden(client, user_headers):
    player_id = test_create_player_admin.player_id
    response = client.delete(f"/players/{player_id}", headers=user_headers)
    assert response.status_code == 403
    assert "Admin privileges required" in response.json().get("detail", "")

def test_delete_player_admin(client, admin_headers):
    player_id = test_create_player_admin.player_id
    response = client.delete(f"/players/{player_id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"