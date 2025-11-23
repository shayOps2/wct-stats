import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Button, Typography, message, Select } from "antd";
import { BACKEND_URL } from "../config";

const { Title, Text } = Typography;
const { Option } = Select;

function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch(`${BACKEND_URL}/teams/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(err => console.error("Failed to fetch teams", err));
  }, []);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Password strength check
  const isPasswordWeak = password.length < 8 || !/\d/.test(password) || !/[A-Za-z]/.test(password);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/login/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        // Fetch user info
        const userRes = await fetch(`${BACKEND_URL}/login/`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const user = await userRes.json();
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user); // <-- update App state
        message.success("Login successful!");
        navigate("/");
      } else {
        setError(data.detail || "Login failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    setPwError("");
    if (isPasswordWeak) {
      setPwError("Password must be at least 8 characters and contain both letters and numbers.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/login/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, team_id: teamId }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("Registration successful! Please log in.");
      } else {
        setError(data.detail || "Registration failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div style={{ maxWidth: 400, margin: "40px auto" }}>
        <Card>
          <Title level={4}>Already logged in</Title>
          <Text>
            Hello <b>{user.username}</b>, you are a <b>{user.role}</b>.
          </Text>
          <Button
            style={{ marginTop: 16 }}
            danger
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              setUser(null); // <-- update App state
              window.location.reload();
            }}
          >
            Logout
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <Card>
        <Title level={3}>Login</Title>
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {pwError && <Text type="danger">{pwError}</Text>}
        {error && <Text type="danger" style={{ display: "block", marginTop: 8 }}>{error}</Text>}
        <Button
          type="primary"
          onClick={handleLogin}
          loading={loading}
          style={{ width: "100%", marginBottom: 8, marginTop: 12 }}
        >
          Login
        </Button>
        <Select
          placeholder="Select Team (Optional)"
          value={teamId}
          onChange={setTeamId}
          style={{ width: "100%", marginBottom: 12 }}
          allowClear
        >
          {teams.map(t => (
            <Option key={t.id} value={t.id}>{t.name}</Option>
          ))}
        </Select>
        <Button
          onClick={handleRegister}
          loading={loading}
          style={{ width: "100%" }}
          disabled={isPasswordWeak}
        >
          Register
        </Button>
      </Card>
    </div>
  );
}

export default Login;