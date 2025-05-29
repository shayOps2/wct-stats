from models import UserRole

def test_register_and_login(client):
    # Register a new user
    username = "testuser"
    password = "Testpass123"
    response = client.post(
        "/login/register",
        json={"username": username, "password": password, "role": UserRole.user}
    )
    
    print(response.json())
    assert response.status_code == 200 
