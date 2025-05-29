from models import UserRole

ADMIN = "admin_test"
ADMIN_PASSWORD = "Adminpass123"

USER = "user_test"
USER_PASSWORD = "Userpass123"


def test_register_and_login(client):
    response = client.post(
        "/login/register",
        json={"username": USER, "password": USER_PASSWORD, "role": UserRole.user}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == USER

    # Try registering the same user again, should get 400
    response2 = client.post(
        "/login/register",
        json={"username": USER, "password": USER_PASSWORD, "role": UserRole.user}
    )
    print(response2.json())
    assert response2.status_code == 400


def test_register_admin_user(client):
    response = client.post(
        "/login/register",
        json={"username": ADMIN, "password": ADMIN_PASSWORD, "role": UserRole.admin}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == ADMIN

def test_get_token_for_users(client):
    # Get token for normal user
    response_user = client.post(
        "/login/token",
        data={"username": USER, "password": USER_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_user.status_code == 200
    data_user = response_user.json()
    assert "access_token" in data_user
    assert data_user["token_type"] == "bearer"

    # Get token for admin user
    response_admin = client.post(
        "/login/token",
        data={"username": ADMIN, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_admin.status_code == 200
    data_admin = response_admin.json()
    assert "access_token" in data_admin
    assert data_admin["token_type"] == "bearer"

def test_wrong_password_gives_401(client):
    # Try to get token with wrong password
    response = client.post(
        "/login/token",
        data={"username": USER, "password": "WrongPassword123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json().get("detail", "")

