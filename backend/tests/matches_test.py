import pytest
from datetime import datetime
from models import UserRole
import json

ADMIN = "admin_matches"
ADMIN_PASSWORD = "Adminpass123"

@pytest.fixture
def admin_token(client):
    # Register admin user
    client.post(
        "/login/register",
        json={"username": ADMIN, "password": ADMIN_PASSWORD, "role": UserRole.admin}
    )
    # Get token
    response = client.post(
        "/login/token",
        data={"username": ADMIN, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return response.json()["access_token"]

@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def mock_players(client):
    # Create two players
    player1 = {"name": "Player One"}
    player2 = {"name": "Player Two"}
    resp1 = client.post("/players/", data=player1)
    resp2 = client.post("/players/", data=player2)
    return [resp1.json()["id"], resp2.json()["id"]]

def test_create_match(client, auth_headers, mock_players):
    data = {
        "match_type": "1v1",
        "date": datetime.now().isoformat(),
        "player1_id": mock_players[0],
        "player2_id": mock_players[1],
        "video_url": "http://example.com/video"
    }
    response = client.post("/matches/", json=data, headers=auth_headers)
    assert response.status_code == 200
    match = response.json()
    assert match["match_type"] == "1v1"
    test_create_match.player1_id = data["player1_id"]
    test_create_match.player2_id = data["player2_id"]
    test_create_match.match_id = match["id"]  # Save for later tests

def test_list_matches(client):
    response = client.get("/matches/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_add_round(client, auth_headers, mock_players):
    match_id = test_create_match.match_id
    round_data = {
        "chaser_id": test_create_match.player1_id,
        "evader_id": test_create_match.player2_id,
        "tag_made": True,
        "tag_time": 10.5,
        "round_hour": 0,
        "round_minute": 1,
        "round_second": 5
    }
    response = client.post(f"/matches/{match_id}/rounds", json=round_data, headers=auth_headers)
    assert response.status_code == 200
    match = response.json()
    assert len(match["rounds"]) == 1

def test_update_round(client, auth_headers):
    match_id = test_create_match.match_id
    update_data = {
        "tag_time": 8.0,
        "round_hour": 0,
        "round_minute": 2,
        "round_second": 0
    }
    response = client.put(f"/matches/{match_id}/rounds/0", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    match = response.json()
    assert match["rounds"][0]["tag_time"] == 8.0

def test_delete_last_round(client, auth_headers):
    match_id = test_create_match.match_id
    response = client.delete(f"/matches/{match_id}/rounds/last", headers=auth_headers)
    assert response.status_code == 200
    match = response.json()
    assert len(match["rounds"]) == 0

def test_get_match_by_id(client):
    match_id = test_create_match.match_id
    response = client.get(f"/matches/{match_id}")
    assert response.status_code == 200
    match = response.json()
    assert match["id"] == match_id

def test_update_match_date(client, auth_headers):
    match_id = test_create_match.match_id
    new_date = datetime.now().isoformat()
    update_data = {"date": new_date}
    response = client.patch(f"/matches/{match_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    match = response.json()
    assert match["date"].startswith(new_date[:10])

def test_delete_match(client, auth_headers):
    match_id = test_create_match.match_id
    response = client.request(
        "DELETE",
        f"/matches/{match_id}",
        content=json.dumps({"confirm": True}),
        headers={**auth_headers, "Content-Type": "application/json"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"