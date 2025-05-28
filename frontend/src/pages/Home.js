import React from "react";
import { Card, Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph } = Typography;

function Home({ setUser }) {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser && setUser(null); // update App state if provided
    window.location.reload();
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Typography>
          <Title level={2}>Welcome to World Chase Tag Statistics</Title>
          <Paragraph>
            This application tracks and visualizes statistics for World Chase Tag matches, 
            providing insights into player performance in both team and 1v1 formats.
          </Paragraph>
          <Paragraph>
            World Chase Tag is a competitive sport combining elements of tag and parkour, 
            where athletes compete in a quad arena with obstacles. Players take turns being 
            either chasers attempting to tag opponents, or evaders trying to avoid being tagged.
          </Paragraph>
          <Title level={4}>Features:</Title>
          <ul>
            <li>Comprehensive player statistics</li>
            <li>Detailed player performance metrics</li>
            <li>Head-to-head comparisons</li>
            <li>Tag location visualization</li>
            <li>Match outcome tracking</li>
          </ul>
          <Paragraph>
            Navigate through the dashboard tabs to explore different aspects of player and match data.
          </Paragraph>
        </Typography>
        {user ? (
          <div style={{ marginTop: 24, textAlign: "right" }}>
            Hello <b>{user.username}</b>, you are a <b>{user.role}</b>
            <Button
              style={{ marginLeft: 16 }}
              danger
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        ) : (
          <Button
            type="primary"
            style={{ marginTop: 24 }}
            onClick={() => navigate("/login")}
          >
            Login / Register
          </Button>
        )}
      </Card>
    </div>
  );
}

export default Home;