import React, { useState, useEffect } from "react";
import { Card, Row, Col, Table, Spin, Alert } from "antd";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState({
    evaders: [],
    chasers: []
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Fetch all players
      const response = await fetch('/players/');
      const playerList = await response.json();
      setPlayers(playerList);

      // Fetch stats for each player
      const playersWithStats = await Promise.all(
        playerList.map(async (player) => {
          const statsResponse = await fetch(`/players/${player.id}/stats`);
          const stats = await statsResponse.json();
          return {
            ...player,
            stats
          };
        })
      );

      // Sort players by different metrics
      const sortedEvaders = [...playersWithStats].sort((a, b) => 
        (b.stats.offense.evasion_success_rate || 0) - (a.stats.offense.evasion_success_rate || 0)
      ).slice(0, 5);

      const sortedChasers = [...playersWithStats].sort((a, b) =>
        (b.stats.defense.tagging_success_rate || 0) - (a.stats.defense.tagging_success_rate || 0)
      ).slice(0, 5);

      setTopPlayers({
        evaders: sortedEvaders,
        chasers: sortedChasers
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError("Failed to load statistics. Please try again later.");
      setLoading(false);
    }
  };

  const columns = {
    evaders: [
      { title: 'Player', dataIndex: 'name', key: 'name' },
      { 
        title: 'Success Rate', 
        dataIndex: ['stats', 'offense', 'evasion_success_rate'], 
        key: 'success_rate',
        render: (rate) => `${rate}%`
      },
      { 
        title: 'Avg Time', 
        dataIndex: ['stats', 'offense', 'average_evasion_time'], 
        key: 'avg_time',
        render: (time) => `${time.toFixed(1)}s`
      }
    ],
    chasers: [
      { title: 'Player', dataIndex: 'name', key: 'name' },
      { 
        title: 'Success Rate', 
        dataIndex: ['stats', 'defense', 'tagging_success_rate'], 
        key: 'success_rate',
        render: (rate) => `${rate}%`
      },
      { 
        title: 'Avg Time', 
        dataIndex: ['stats', 'defense', 'average_tag_time'], 
        key: 'avg_time',
        render: (time) => `${time.toFixed(1)}s`
      }
    ]
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>World Chase Tag Dashboard</h2>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top Evaders" bordered={false}>
            <Table 
              dataSource={topPlayers.evaders}
              columns={columns.evaders}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Top Chasers" bordered={false}>
            <Table 
              dataSource={topPlayers.chasers}
              columns={columns.chasers}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
