import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Spin, 
  Alert, 
  Select, 
  DatePicker, 
  Button, 
  Divider, 
  Statistic,
  Tooltip,
  Empty
} from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

function PlayerDetail() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [playerPins, setPlayerPins] = useState([]);
  const [loadingPins, setLoadingPins] = useState(false);

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
      setLoading(false);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError("Failed to load players. Please try again later.");
      setLoading(false);
    }
  };

  const fetchPlayerStats = useCallback(async () => {
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
        if (dateRange) {
          // If dateRange has at least a start date
          if (dateRange[0]) {
            const startDate = dateRange[0].toISOString();
            url += `start_date=${startDate}&`;
            
            // If end date is also provided, use it; otherwise default to today
            if (dateRange[1]) {
              const endDate = dateRange[1].toISOString();
              url += `end_date=${endDate}&`;
            }
          }
        }
        
        statsResponse = await fetch(url);
      } else {
        // Otherwise use the regular stats endpoint
        url = `/players/${selectedPlayer}/stats?`;
        
        // Add date filters if provided
        if (dateRange) {
          // If dateRange has at least a start date
          if (dateRange[0]) {
            const startDate = dateRange[0].toISOString();
            url += `start_date=${startDate}&`;
            
            // If end date is also provided, use it; otherwise default to today
            if (dateRange[1]) {
              const endDate = dateRange[1].toISOString();
              url += `end_date=${endDate}&`;
            }
          }
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
  }, [selectedPlayer, selectedOpponent, dateRange, matchType]);

  // Reset player stats when filters change
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerStats();
    }
  }, [selectedPlayer, fetchPlayerStats]);
  
  // Clear match type when opponent is selected
  useEffect(() => {
    if (selectedOpponent) {
      setMatchType(null);
    }
  }, [selectedOpponent]);

  // Add a function to fetch pins for the selected player
  const fetchPlayerPins = useCallback(async () => {
    if (!selectedPlayer) return;
    
    try {
      setLoadingPins(true);
      
      // Get all matches the player participated in
      const matchesResponse = await fetch(`/matches/?player_id=${selectedPlayer}`);
      
      if (!matchesResponse.ok) {
        console.error("Failed to fetch player matches");
        setLoadingPins(false);
        return;
      }
      
      const matches = await matchesResponse.json();
      
      // No need to proceed if no matches
      if (!matches || matches.length === 0) {
        setPlayerPins([]);
        setLoadingPins(false);
        return;
      }
      
      // Fetch pins for each match
      const allPins = [];
      for (const match of matches) {
        const pinsResponse = await fetch(`/pins/?match_id=${match.id}`);
        if (pinsResponse.ok) {
          const matchPins = await pinsResponse.json();
          
          // Only include pins where the player was either chaser or evader
          const playerPins = matchPins.filter(pin => 
            pin.chaser_id === selectedPlayer || pin.evader_id === selectedPlayer
          );
          
          // Add match details to each pin for context
          const pinsWithContext = playerPins.map(pin => {
            // Find the round details
            const round = match.rounds[pin.round_index];
            return {
              ...pin,
              matchDetails: {
                date: new Date(match.date).toLocaleDateString(),
                type: match.match_type,
                opponent: pin.chaser_id === selectedPlayer ? 
                  round.evader.name : round.chaser.name,
                playerRole: pin.chaser_id === selectedPlayer ? 'Chaser' : 'Evader'
              }
            };
          });
          
          allPins.push(...pinsWithContext);
        }
      }
      
      setPlayerPins(allPins);
      setLoadingPins(false);
    } catch (error) {
      console.error("Error fetching player pins:", error);
      setLoadingPins(false);
      setPlayerPins([]);
    }
  }, [selectedPlayer]);

  // Fetch pins when a player is selected
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerPins();
    } else {
      setPlayerPins([]);
    }
  }, [selectedPlayer, fetchPlayerPins]);

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
      <h2>Player Details</h2>
      
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
              onChange={value => {
                // Value will be null when user clears the picker
                if (!value) {
                  setDateRange(null);
                  return;
                }
                
                // If both dates are set or none, use value directly
                if ((value[0] && value[1]) || (!value[0] && !value[1])) {
                  setDateRange(value);
                } 
                // If only one date is set, treat it as the start date
                else if (value[0] && !value[1]) {
                  setDateRange([value[0], null]);
                }
              }}
              allowEmpty={[false, true]} 
              placeholder={['Start Date', 'End Date (optional)']}
              disabled={!selectedPlayer}
            />
          </Col>
          
          <Col xs={24}>
            <Button 
              type="primary" 
              onClick={fetchPlayerStats}
              disabled={!selectedPlayer}
              loading={loadingPlayerStats}
              style={{ marginTop: '8px', marginRight: '8px' }}
            >
              Apply Filters
            </Button>

            {/* Clear filters button */}
            {(dateRange || matchType || selectedOpponent) && (
              <Button
                onClick={() => {
                  setDateRange(null);
                  setMatchType(null);
                  setSelectedOpponent(null);
                  // If player is still selected, fetch stats without filters
                  if (selectedPlayer) {
                    setTimeout(fetchPlayerStats, 0);
                  }
                }}
                style={{ marginTop: '8px' }}
              >
                Clear Filters
              </Button>
            )}
          </Col>
          
          {/* Show active filters summary */}
          {selectedPlayer && (dateRange || matchType || selectedOpponent) && (
            <Col xs={24}>
              <div style={{ marginTop: '16px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Active Filters:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {dateRange && dateRange[0] && (
                    <li>
                      Date Range: {dateRange[0].format('MMM D, YYYY')}
                      {dateRange[1] ? ` to ${dateRange[1].format('MMM D, YYYY')}` : ' to Today'}
                    </li>
                  )}
                  {matchType && (
                    <li>Match Type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}</li>
                  )}
                  {selectedOpponent && (
                    <li>Opponent: {players.find(p => p.id === selectedOpponent)?.name}</li>
                  )}
                </ul>
              </div>
            </Col>
          )}
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
                {matchType && !selectedOpponent && (
                  <p style={{ margin: 0, color: '#666' }}>
                    Match type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}
                  </p>
                )}
              </Card>
            </Col>
            
            {/* Match Statistics Card */}
            <Col xs={24}>
              <Card title="Match Statistics" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col xs={8}>
                    <Statistic 
                      title="Matches Played" 
                      value={playerStats.overall.matches_played} 
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic 
                      title="Matches Won" 
                      value={playerStats.overall.matches_won} 
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic 
                      title="Win Percentage" 
                      value={playerStats.overall.win_percentage} 
                      suffix="%" 
                      valueStyle={{ 
                        color: playerStats.overall.win_percentage > 50 ? '#3f8600' : 
                               playerStats.overall.win_percentage === 0 ? '#cf1322' : '#faad14'
                      }}
                    />
                  </Col>
                </Row>
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
            
            {/* Quad Map with Player Pins */}
            <Col xs={24}>
              <Card 
                title={`Tag Locations for ${players.find(p => p.id === selectedPlayer)?.name}`} 
                bordered={false}
                style={{ marginBottom: 24 }}
              >
                {loadingPins ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin size="large" />
                  </div>
                ) : playerPins.length > 0 ? (
                  <div>
                    <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
                      <img 
                        src="/images/quad.jpg" 
                        alt="Quad Map" 
                        style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}
                      />
                      
                      {/* Map pins */}
                      {playerPins.map((pin, index) => (
                        <Tooltip 
                          key={index} 
                          title={
                            <div>
                              <div>Date: {pin.matchDetails.date}</div>
                              <div>Match Type: {pin.matchDetails.type}</div>
                              <div>Against: {pin.matchDetails.opponent}</div>
                              <div>Role: {pin.matchDetails.playerRole}</div>
                            </div>
                          }
                        >
                          <div 
                            style={{
                              position: 'absolute',
                              left: `${pin.location.x - 5}px`, 
                              top: `${pin.location.y - 5}px`,  
                              width: '10px',
                              height: '10px',
                              backgroundColor: pin.chaser_id === selectedPlayer ? 'red' : 'blue',
                              borderRadius: '50%',
                              border: '1px solid white',
                              cursor: 'pointer'
                            }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                    
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
                      <div>
                        <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: 'red', borderRadius: '50%', marginRight: 8 }}></span>
                        As Chaser
                      </div>
                      <div>
                        <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: 'blue', borderRadius: '50%', marginRight: 8 }}></span>
                        As Evader
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty description="No tag locations recorded for this player" />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}

export default PlayerDetail; 