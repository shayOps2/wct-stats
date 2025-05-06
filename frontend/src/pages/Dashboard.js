import React, { useState, useEffect } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Spin, 
  Alert, 
  Select, 
  DatePicker, 
  Button, 
  Divider, 
  Space, 
  Statistic 
} from "antd";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topPlayers, setTopPlayers] = useState({
    evaders: [],
    chasers: []
  });
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
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

  const fetchPlayerStats = async () => {
    if (!selectedPlayer) return;

    try {
      setLoadingPlayerStats(true);
      setStatsError(null);
      
      let url;
      let statsResponse;
      
      // If opponent is selected, use the head-to-head endpoint
      if (selectedOpponent) {
        url = `/players/${selectedPlayer}/versus/${selectedOpponent}?`;
        
        // Add date filters if provided
        if (dateRange && dateRange[0] && dateRange[1]) {
          const startDate = dateRange[0].toISOString();
          const endDate = dateRange[1].toISOString();
          url += `start_date=${startDate}&end_date=${endDate}&`;
        }
        
        statsResponse = await fetch(url);
      } else {
        // Otherwise use the regular stats endpoint
        url = `/players/${selectedPlayer}/stats?`;
        
        // Add date filters if provided
        if (dateRange && dateRange[0] && dateRange[1]) {
          const startDate = dateRange[0].toISOString();
          const endDate = dateRange[1].toISOString();
          url += `start_date=${startDate}&end_date=${endDate}&`;
        }
        
        // Add match type filter if provided
        if (matchType) {
          url += `match_type=${matchType}&`;
        }
        
        statsResponse = await fetch(url);
      }
      
      if (!statsResponse.ok) {
        throw new Error(`Error fetching stats: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      
      const stats = await statsResponse.json();
      setPlayerStats(stats);
      setLoadingPlayerStats(false);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setStatsError("Failed to load player statistics. Please try again later.");
      setLoadingPlayerStats(false);
      setPlayerStats(null);
    }
  };

  // Reset player stats when filters change
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerStats();
    }
  }, [selectedPlayer]);
  
  // Clear match type when opponent is selected
  useEffect(() => {
    if (selectedOpponent) {
      setMatchType(null);
    }
  }, [selectedOpponent]);

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

      <Divider orientation="left">Player Statistics</Divider>
      
      <Card bordered={false}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Player"
              onChange={setSelectedPlayer}
              allowClear
            >
              {players.map(player => (
                <Option key={player.id} value={player.id}>{player.name}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Played Against"
              onChange={setSelectedOpponent}
              allowClear
              disabled={!selectedPlayer}
            >
              {players
                .filter(player => player.id !== selectedPlayer)
                .map(player => (
                  <Option key={player.id} value={player.id}>{player.name}</Option>
                ))
              }
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Match Type"
              onChange={setMatchType}
              allowClear
              disabled={!selectedPlayer || selectedOpponent}
            >
              <Option value="1v1">1v1</Option>
              <Option value="team">Team</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <RangePicker 
              style={{ width: '100%' }}
              onChange={setDateRange}
              disabled={!selectedPlayer}
            />
          </Col>
          
          <Col xs={24}>
            <Button 
              type="primary" 
              onClick={fetchPlayerStats}
              disabled={!selectedPlayer}
              loading={loadingPlayerStats}
              style={{ marginTop: '8px' }}
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
        
        {!selectedPlayer && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Alert 
                message="Select a player to view their statistics" 
                type="info" 
                showIcon 
              />
            </Col>
          </Row>
        )}
        
        {statsError && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Alert 
                message={statsError}
                type="error" 
                showIcon 
              />
            </Col>
          </Row>
        )}
        
        {loadingPlayerStats && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Spin size="large" />
            </Col>
          </Row>
        )}
        
        {playerStats && selectedPlayer && !loadingPlayerStats && (
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <Card>
                <h2 style={{ margin: 0, marginBottom: 8 }}>
                  {players.find(p => p.id === selectedPlayer)?.name}'s Statistics
                  {selectedOpponent && (
                    <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '8px' }}>
                      vs {players.find(p => p.id === selectedOpponent)?.name}
                    </span>
                  )}
                </h2>
                {dateRange && dateRange[0] && dateRange[1] && (
                  <p style={{ margin: 0, color: '#666' }}>
                    Period: {dateRange[0].format('MMM D, YYYY')} - {dateRange[1].format('MMM D, YYYY')}
                  </p>
                )}
                {matchType && !selectedOpponent && (
                  <p style={{ margin: 0, color: '#666' }}>
                    Match type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}
                  </p>
                )}
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Offense (as Evader)" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic 
                      title="Total Evasion Attempts" 
                      value={playerStats.offense.total_evasion_attempts} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Successful Evasions" 
                      value={playerStats.offense.successful_evasions} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Success Rate" 
                      value={playerStats.offense.evasion_success_rate} 
                      suffix="%" 
                      valueStyle={{ color: playerStats.offense.evasion_success_rate > 50 ? '#3f8600' : '#cf1322' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Average Evasion Time" 
                      value={playerStats.offense.average_evasion_time} 
                      suffix="s" 
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Defense (as Chaser)" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic 
                      title="Total Chase Attempts" 
                      value={playerStats.defense.total_chase_attempts} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Successful Tags" 
                      value={playerStats.defense.successful_tags} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Success Rate" 
                      value={playerStats.defense.tagging_success_rate} 
                      suffix="%" 
                      valueStyle={{ color: playerStats.defense.tagging_success_rate > 50 ? '#3f8600' : '#cf1322' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Average Tag Time" 
                      value={playerStats.defense.average_tag_time} 
                      suffix="s" 
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            
            <Col xs={24}>
              <Card bordered={false}>
                <Statistic 
                  title="Total Rounds" 
                  value={playerStats.overall.total_rounds} 
                  valueStyle={{ fontSize: '24px' }}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
