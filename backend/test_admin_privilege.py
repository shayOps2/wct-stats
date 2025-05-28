import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app as fastapi_app
from models import UserRole
import json

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_token(client):
    # Register admin_test user if not exists
    await client.post("/login/register", json={"username": "admin_test", "password": "AdminTest123", "role": UserRole.admin})
    res = await client.post("/login/token", data={"username": "admin_test", "password": "AdminTest123", "role": UserRole.user})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest_asyncio.fixture
async def user_token(client):
    await client.post("/login/register", json={"username": "testuser", "password": "Password123"})
    res = await client.post("/login/token", data={"username": "testuser", "password": "Password123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_restricted_match_endpoints(client, admin_token, user_token):
    ac = client

    # --- 1. CREATE MATCH ---
    match_data = {
        "match_type": "1v1",
        "date": "2024-01-01T12:00:00",
        "player1_id": 1,
        "player2_id": 2
    }
    res = await ac.post("/matches/", json=match_data, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    res = await ac.post("/matches/", json=match_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    match_id = res.json()["id"]

    # --- 2. ADD ROUND ---
    round_data = {
        "chaser_id": 1,
        "evader_id": 2,
        "tag_made": True,
        "tag_time": 10.0,
        "round_hour": 0,
        "round_minute": 0,
        "round_second": 5
    }
    res = await ac.post(f"/matches/{match_id}/rounds", json=round_data, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    res = await ac.post(f"/matches/{match_id}/rounds", json=round_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # --- 3. UPDATE MATCH ---
    res = await ac.get(f"/matches/{match_id}")
    match_obj = res.json()
    res = await ac.put(f"/matches/{match_id}", json=match_obj, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    res = await ac.put(f"/matches/{match_id}", json=match_obj, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # --- 4. UPDATE ROUND ---
    update_round_data = {
        "tag_made": True,
        "tag_time": 12.0,
        "round_hour": 0,
        "round_minute": 0,
        "round_second": 10
    }
    res = await ac.put(f"/matches/{match_id}/rounds/0", json=update_round_data, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    res = await ac.put(f"/matches/{match_id}/rounds/0", json=update_round_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # --- 5. DELETE LAST ROUND ---
    res = await ac.delete(f"/matches/{match_id}/rounds/last", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    res = await ac.delete(f"/matches/{match_id}/rounds/last", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # --- 6. REMOVE MATCH ---
    res = await ac.delete(
        f"/matches/{match_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"confirm": True}
    )
    assert res.status_code == 403
    res = await ac.delete(
        f"/matches/{match_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"confirm": True}
    )
    assert res.status_code in (200, 404)


@pytest.mark.asyncio
async def test_create_player(client, admin_token):
    p1 = await client.post(
        "/players/",
        data={"name": "Player One"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert p1.status_code == 200, p1.text
    player1_id = p1.json()["id"]
    assert player1_id


@pytest.mark.asyncio
async def test_create_match(client, admin_token, user_token):
    # Create players
    p1 = await client.post("/players/", data={"name": "Player One"}, headers={"Authorization": f"Bearer {admin_token}"})
    p2 = await client.post("/players/", data={"name": "Player Two"}, headers={"Authorization": f"Bearer {admin_token}"})
    player1_id = p1.json()["id"]
    player2_id = p2.json()["id"]

    match_data = {
        "match_type": "1v1",
        "date": "2024-01-01T12:00:00",
        "player1_id": player1_id,
        "player2_id": player2_id
    }
    # User should be forbidden
    res = await client.post("/matches/", json=match_data, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    # Admin should succeed
    res = await client.post("/matches/", json=match_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    match_id = res.json()["id"]
    assert match_id


@pytest.mark.asyncio
async def test_remove_match(client, admin_token, user_token):
    # Create players and match as admin
    p1 = await client.post("/players/", data={"name": "Player One"}, headers={"Authorization": f"Bearer {admin_token}"})
    p2 = await client.post("/players/", data={"name": "Player Two"}, headers={"Authorization": f"Bearer {admin_token}"})
    player1_id = p1.json()["id"]
    player2_id = p2.json()["id"]
    match_data = {
        "match_type": "1v1",
        "date": "2024-01-01T12:00:00",
        "player1_id": player1_id,
        "player2_id": player2_id
    }
    res = await client.post("/matches/", json=match_data, headers={"Authorization": f"Bearer {admin_token}"})
    match_id = res.json()["id"]

    # User should be forbidden
    res = await client.request(
        "DELETE",
        f"/matches/{match_id}",
        content=json.dumps({"confirm": True}),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {user_token}"}
    )
    assert res.status_code == 403

    # Admin should succeed
    res = await client.request(
        "DELETE",
        f"/matches/{match_id}",
        content=json.dumps({"confirm": True}),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in (200, 404)
