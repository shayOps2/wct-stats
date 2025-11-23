from models import UserRole
import pytest

ADMIN = "admin_team_test"
ADMIN_PASSWORD = "Adminpass123"
USER = "user_team_test"
USER_PASSWORD = "Userpass123"

@pytest.fixture
def admin_token(client):
    client.post("/login/register", json={"username": ADMIN, "password": ADMIN_PASSWORD, "role": UserRole.admin})
    resp = client.post("/login/token", data={"username": ADMIN, "password": ADMIN_PASSWORD})
    return resp.json()["access_token"]

@pytest.fixture
def user_token(client):
    client.post("/login/register", json={"username": USER, "password": USER_PASSWORD, "role": UserRole.user})
    resp = client.post("/login/token", data={"username": USER, "password": USER_PASSWORD})
    return resp.json()["access_token"]

def test_create_team(client, admin_token):
    resp = client.post("/teams/", json={"name": "Team A"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Team A"
    assert "id" in resp.json()

def test_create_team_user_forbidden(client, user_token):
    resp = client.post("/teams/", json={"name": "Team B"}, headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403

def test_list_teams(client, admin_token):
    # Ensure at least one team exists
    client.post("/teams/", json={"name": "Team C"}, headers={"Authorization": f"Bearer {admin_token}"})
    
    resp = client.get("/teams/")
    assert resp.status_code == 200
    teams = resp.json()
    assert len(teams) >= 1
    assert any(t["name"] == "Team C" for t in teams)

def test_delete_team(client, admin_token):
    resp = client.post("/teams/", json={"name": "Team D"}, headers={"Authorization": f"Bearer {admin_token}"})
    team_id = resp.json()["id"]
    
    del_resp = client.delete(f"/teams/{team_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_resp.status_code == 200
    
    get_resp = client.get("/teams/")
    teams = get_resp.json()
    assert not any(t["id"] == team_id for t in teams)

def test_delete_team_user_forbidden(client, user_token, admin_token):
    resp = client.post("/teams/", json={"name": "Team E"}, headers={"Authorization": f"Bearer {admin_token}"})
    team_id = resp.json()["id"]
    
    del_resp = client.delete(f"/teams/{team_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert del_resp.status_code == 403
