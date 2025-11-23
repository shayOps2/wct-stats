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

@pytest.fixture
def created_player(client, admin_headers):
    response = client.post(
        "/players/",
        data={"name": "Fixture Player"},
        headers=admin_headers
    )
    assert response.status_code == 200
    player = response.json()
    return player["id"]

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

def test_list_players(client, admin_headers):
    response = client.get("/players/", headers=admin_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_player_by_id(client, admin_headers, created_player):
    player_id = created_player
    response = client.get(f"/players/{player_id}", headers=admin_headers)
    assert response.status_code == 200
    player = response.json()
    assert player["id"] == player_id

def test_player_image_upload_and_get(client, admin_headers):
    # Upload player with image
    image_bytes = b"testimagecontent"
    files = {"image": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")}
    response = client.post(
        "/players/",
        data={"name": "Image Player"},
        files=files,
        headers=admin_headers
    )
    assert response.status_code == 200
    player = response.json()
    assert player["name"] == "Image Player"
    assert player.get("image_id")
    player_id = player["id"]

    # Get player image
    img_response = client.get(f"/players/{player_id}/image")
    assert img_response.status_code == 200
    assert img_response.content == image_bytes

def test_delete_player_non_admin_forbidden(client, user_headers, created_player):
    player_id = created_player
    response = client.delete(f"/players/{player_id}", headers=user_headers)
    assert response.status_code == 403
    assert "Admin privileges required" in response.json().get("detail", "")

def test_delete_player_admin(client, admin_headers, created_player):
    player_id = created_player
    response = client.delete(f"/players/{player_id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"